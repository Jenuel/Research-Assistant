"""
Rate limiting.

Two layers, deliberately:

*   A pre-auth throttle (`throttle_by_ip`), run as HTTP middleware and keyed on
    the client IP. It is the only thing standing in front of unauthenticated
    traffic. Every route here sits behind a Clerk dependency, and slowapi's
    decorator wraps the *endpoint function* — which FastAPI only reaches after
    dependencies resolve. A request with a forged token therefore dies in the
    auth dependency having already cost an RSA signature verification that no
    decorator limit ever saw. Middleware runs before routing, so this layer
    sees it. It also runs before the request body is consumed, so an
    over-limit upload is rejected without being parsed.

*   Per-user quotas (`limiter`, applied as `@limiter.limit(...)` on routes),
    keyed on the verified Clerk user ID. This is the fair-use budget for
    legitimate callers.

Everything above the END SHARED REGION marker near the bottom is byte-identical
between document_service and rag_service; `scripts/check_rate_limit_parity.py`
enforces that. Only the per-route limits below the marker differ.
"""

import math
import os
import time
from typing import List

from fastapi import Request, status
from fastapi.responses import JSONResponse
from limits import RateLimitItem, parse_many
from limits.storage import storage_from_string
from limits.strategies import FixedWindowRateLimiter, MovingWindowRateLimiter
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.logging import get_logger

logger = get_logger(__name__)


# --- configuration helpers -------------------------------------------------

def resolve_rate_limits(env_var: str, default: str) -> str:
    """
    Resolve a slowapi limit string from the environment, validating it.

    Falls back to *default* when unset or unparseable — a typo must never be
    read as "no limit". Validating at import means a bad value fails visibly at
    startup rather than on the first request.

    :param env_var: Name of the environment variable to read.
    :param default: Limit string to use when absent or invalid.
    :return: A valid slowapi limit string.
    """
    raw = os.getenv(env_var, "").strip()
    if not raw:
        return default

    try:
        if not parse_many(raw):
            raise ValueError("no limits parsed")
    except Exception as e:
        logger.warning(
            f"{env_var}={raw!r} is not a valid rate limit ({type(e).__name__}); "
            f"falling back to {default!r}"
        )
        return default

    return raw


def _resolve_flag(env_var: str, default: bool) -> bool:
    """
    Resolve a boolean from the environment, accepting the usual spellings.

    :param env_var: Name of the environment variable to read.
    :param default: Value to use when absent or unrecognized.
    :return: The resolved flag.
    """
    raw = os.getenv(env_var, "").strip().lower()
    if not raw:
        return default
    if raw in {"1", "true", "yes", "on"}:
        return True
    if raw in {"0", "false", "no", "off"}:
        return False

    logger.warning(f"{env_var}={raw!r} is not a boolean; falling back to {default}")
    return default


# --- bucket keys -----------------------------------------------------------

def clerk_user_key(request: Request) -> str:
    """
    Rate-limit key: the Clerk user ID, falling back to the client IP.

    `get_current_user_id` stashes the verified `sub` on `request.state`, and
    FastAPI resolves dependencies before calling the endpoint that slowapi
    wraps — so by the time this runs on a protected route, the ID is present.

    The IP fallback only applies to unprotected routes. It must never return a
    constant: that would put every anonymous caller in one shared bucket, so a
    single client could lock out everyone else.

    :param request: The incoming request.
    :return: Bucket key for this caller.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"

    return f"ip:{get_remote_address(request)}"


def client_ip_key(request: Request) -> str:
    """
    Rate-limit key for the pre-auth layer: always the client IP.

    Unlike `clerk_user_key` this never consults `request.state` — it runs in
    middleware, before any dependency has verified a token, so a user ID there
    would be attacker-controlled.

    `get_remote_address` reads the peer address. Behind a reverse proxy that is
    the *proxy's* address unless uvicorn is told to trust forwarded headers
    (see FORWARDED_ALLOW_IPS in .env.example) — and an untrusted proxy setup
    collapses every caller into one bucket, which is the failure this layer
    exists to prevent. Configure it before putting a proxy in front.

    :param request: The incoming request.
    :return: Bucket key for this caller.
    """
    return f"ip:{get_remote_address(request)}"


def global_key(request: Request) -> str:
    """
    Rate-limit key for app-wide ceilings: one bucket for the whole service.

    This is the one legitimate use of a constant key — the shared bucket is the
    point. Used for spend caps, where the question is "how much has this
    service done in total", not "how much has this caller done".

    The parameter must be named `request` even though it goes unused: slowapi
    inspects the signature by name and calls the key function with no arguments
    at all when it does not find that exact name.

    :param request: Unused; present for slowapi's signature inspection.
    :return: The single shared bucket key.
    """
    return "global"


# --- storage ---------------------------------------------------------------

RATE_LIMIT_STORAGE_URI = os.getenv("RATE_LIMIT_STORAGE_URI", "memory://").strip() or "memory://"
DEFAULT_RATE_LIMIT_STRATEGY = "moving-window"
_STRATEGIES = {
    "fixed-window": FixedWindowRateLimiter,
    "moving-window": MovingWindowRateLimiter,
}

_raw_strategy = os.getenv("RATE_LIMIT_STRATEGY", "").strip().lower()
if _raw_strategy and _raw_strategy not in _STRATEGIES:
    logger.warning(
        f"RATE_LIMIT_STRATEGY={_raw_strategy!r} is not one of "
        f"{sorted(_STRATEGIES)}; falling back to {DEFAULT_RATE_LIMIT_STRATEGY!r}"
    )
    _raw_strategy = ""
RATE_LIMIT_STRATEGY = _raw_strategy or DEFAULT_RATE_LIMIT_STRATEGY

RATE_LIMIT_FAIL_OPEN = _resolve_flag("RATE_LIMIT_FAIL_OPEN", True)

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

if RATE_LIMIT_STORAGE_URI.startswith("memory://"):
    _message = (
        "Rate limit counters are in-process (memory://): limits are per worker, "
        "not per service, and reset on restart. Set RATE_LIMIT_STORAGE_URI to a "
        "Redis URL before running more than one worker or replica."
    )
    if APP_ENV in {"production", "prod", "staging"}:
        logger.warning(f"APP_ENV={APP_ENV}: {_message}")
    else:
        logger.info(_message)


# --- per-user quotas (slowapi, applied per route) --------------------------

limiter = Limiter(
    key_func=clerk_user_key,
    storage_uri=RATE_LIMIT_STORAGE_URI,
    strategy=RATE_LIMIT_STRATEGY,
    headers_enabled=True,
    swallow_errors=RATE_LIMIT_FAIL_OPEN,
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Log the rejection, then hand off to slowapi's handler for the 429.

    slowapi's own handler is silent, which leaves no way to tell whether limits
    are being hit, by whom, or how often — so they cannot be tuned from
    evidence, and sustained abuse looks exactly like quiet.

    :param request: The rejected request.
    :param exc: The limiter's rejection, carrying the limit that tripped.
    :return: slowapi's 429 response, with its rate-limit headers.
    """
    logger.warning(
        f"429 {request.method} {request.url.path} — "
        f"key={clerk_user_key(request)} limit={exc.detail}"
    )

    response = _rate_limit_exceeded_handler(request, exc)
    if hasattr(response, "__await__"):
        response = await response
    return response


# --- pre-auth throttle (middleware, IP-keyed) ------------------------------

DEFAULT_PREAUTH_RATE_LIMITS = "120/minute"
PREAUTH_RATE_LIMITS = resolve_rate_limits(
    "PREAUTH_RATE_LIMITS", DEFAULT_PREAUTH_RATE_LIMITS
)

PREAUTH_EXEMPT_PATHS = frozenset({"/", "/docs", "/redoc", "/openapi.json", "/favicon.ico"})

_preauth_storage = storage_from_string(RATE_LIMIT_STORAGE_URI)
_preauth_limiter = _STRATEGIES[RATE_LIMIT_STRATEGY](_preauth_storage)
_preauth_items: List[RateLimitItem] = parse_many(PREAUTH_RATE_LIMITS)


def _retry_after(item: RateLimitItem, key: str) -> int:
    """
    Seconds until *key* may retry under *item*, for the Retry-After header.

    :param item: The limit that rejected the request.
    :param key: The bucket key that was rejected.
    :return: A whole number of seconds, never below 1.
    """
    try:
        reset_time, _remaining = _preauth_limiter.get_window_stats(item, key)
        return max(1, math.ceil(reset_time - time.time()))
    except Exception:
        return int(item.get_expiry())


async def throttle_by_ip(request: Request, call_next):
    """
    HTTP middleware applying an IP-keyed limit before auth or body parsing.

    Runs ahead of routing, so it covers unauthenticated requests — which the
    per-route decorators cannot, since those wrap endpoints that FastAPI only
    calls once the Clerk dependency has already done its work. It also returns
    without touching `request.body()`, so a rejected upload is never spooled or
    parsed.

    Fails open on storage errors when RATE_LIMIT_FAIL_OPEN is set: a Redis blip
    should not take down the service.
    """
    if request.method == "OPTIONS" or request.url.path in PREAUTH_EXEMPT_PATHS:
        return await call_next(request)

    key = client_ip_key(request)

    try:
        rejected = next(
            (item for item in _preauth_items if not _preauth_limiter.test(item, key)),
            None,
        )
        if rejected is None:
            for item in _preauth_items:
                _preauth_limiter.hit(item, key)
    except Exception as e:
        if not RATE_LIMIT_FAIL_OPEN:
            raise
        logger.error(
            f"Pre-auth throttle storage unavailable ({type(e).__name__}); "
            f"allowing request. Limits are not being enforced."
        )
        return await call_next(request)

    if rejected is not None:
        retry_after = _retry_after(rejected, key)
        logger.warning(
            f"429 {request.method} {request.url.path} — "
            f"pre-auth throttle, key={key} limit={rejected}"
        )
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": f"Rate limit exceeded: {rejected}"},
            headers={"Retry-After": str(retry_after)},
        )

    return await call_next(request)


logger.info(
    f"Rate limiting active: pre-auth={PREAUTH_RATE_LIMITS}, "
    f"strategy={RATE_LIMIT_STRATEGY}, "
    f"storage={RATE_LIMIT_STORAGE_URI.split('://')[0]}://, "
    f"fail_open={RATE_LIMIT_FAIL_OPEN}"
)


# ===========================================================================
# END SHARED REGION
#
# Everything ABOVE this marker is byte-identical in document_service and
# rag_service, and `python scripts/check_rate_limit_parity.py` enforces it.
# Change it in one service and you must change it in the other.
#
# Everything BELOW is this service's own route limits.
# ===========================================================================

DEFAULT_GENERATE_RATE_LIMITS = "10/minute;200/day"
DEFAULT_GLOBAL_GENERATE_RATE_LIMITS = "2000/day"

GENERATE_RATE_LIMITS = resolve_rate_limits(
    "GENERATE_RATE_LIMITS", DEFAULT_GENERATE_RATE_LIMITS
)
GLOBAL_GENERATE_RATE_LIMITS = resolve_rate_limits(
    "GLOBAL_GENERATE_RATE_LIMITS", DEFAULT_GLOBAL_GENERATE_RATE_LIMITS
)

logger.info(
    f"Generate limits: per_user={GENERATE_RATE_LIMITS}, "
    f"global={GLOBAL_GENERATE_RATE_LIMITS}"
)
