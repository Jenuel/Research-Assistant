"""Covers SEC-12 on the paid endpoint: /api/rag/generate calls Gemini, so an
unthrottled account drains a real budget.

The limiter machinery is a copy of the document service's (see DUP-1), kept in
step by scripts/check_rate_limit_parity.py. It is tested in both services
deliberately, so drift fails a test rather than passing silently.
"""

from types import SimpleNamespace

import pytest
from fastapi import Depends, FastAPI, Request, Response
from fastapi.testclient import TestClient
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

from app.core import rate_limit
from app.core.rate_limit import (
    clerk_user_key,
    client_ip_key,
    global_key,
    rate_limit_exceeded_handler,
    resolve_rate_limits,
)


def _request(user_id=None, client_host="203.0.113.7"):
    state = SimpleNamespace()
    if user_id is not None:
        state.user_id = user_id
    return SimpleNamespace(
        state=state,
        client=SimpleNamespace(host=client_host),
        headers={},
        scope={"client": (client_host, 1234)},
    )


# --- key functions --------------------------------------------------------

def test_key_is_the_clerk_user_when_authenticated():
    assert clerk_user_key(_request(user_id="user_abc")) == "user:user_abc"


def test_same_user_from_different_ips_shares_one_bucket():
    assert clerk_user_key(_request("user_a", "203.0.113.7")) == clerk_user_key(
        _request("user_a", "198.51.100.9")
    )


def test_falls_back_to_ip_when_unauthenticated():
    key = clerk_user_key(_request(user_id=None))

    assert key.startswith("ip:")
    assert key != clerk_user_key(_request(None, client_host="198.51.100.9"))


def test_ip_key_ignores_a_claimed_user_id():
    """client_ip_key runs before any token has been verified."""
    assert client_ip_key(_request(user_id="user_a", client_host="203.0.113.7")) == (
        client_ip_key(_request(user_id=None, client_host="203.0.113.7"))
    )


def test_global_key_is_shared_by_every_caller():
    assert global_key(_request("user_a", "203.0.113.7")) == global_key(
        _request("user_b", "198.51.100.9")
    )


# --- config resolution ----------------------------------------------------

def test_default_has_both_a_burst_and_a_daily_window():
    """The daily cap is what bounds one user's Gemini spend — a burst-limited
    account can otherwise sit at the per-minute cap all day."""
    from limits import parse_many

    assert len(parse_many(rate_limit.GENERATE_RATE_LIMITS)) >= 2


@pytest.mark.parametrize(
    "name", ["GENERATE_RATE_LIMITS", "GLOBAL_GENERATE_RATE_LIMITS",
             "PREAUTH_RATE_LIMITS"]
)
def test_configured_limits_are_parseable(name):
    from limits import parse_many

    assert parse_many(getattr(rate_limit, name))


@pytest.mark.parametrize("value", ["", "   ", "many", "10", "10/fortnight"])
def test_malformed_limit_never_means_unlimited(monkeypatch, value):
    monkeypatch.setenv("GENERATE_RATE_LIMITS", value)
    assert (
        resolve_rate_limits("GENERATE_RATE_LIMITS", "10/minute;200/day")
        == "10/minute;200/day"
    )


def test_global_ceiling_exceeds_the_per_user_daily_cap():
    """A global limit below the per-user one would make the per-user limit
    unreachable and the configuration a lie."""
    from limits import parse_many

    per_user_daily = max(
        (item.amount for item in parse_many(rate_limit.GENERATE_RATE_LIMITS)
         if item.GRANULARITY.seconds >= 86400),
        default=0,
    )
    global_daily = max(
        item.amount for item in parse_many(rate_limit.GLOBAL_GENERATE_RATE_LIMITS)
    )

    assert global_daily >= per_user_daily


def test_strategy_is_a_moving_window_by_default():
    assert rate_limit.RATE_LIMIT_STRATEGY == "moving-window"


# --- end-to-end through a limited route -----------------------------------

def _app(limits, global_limits=None):
    app = FastAPI()
    limiter = Limiter(
        key_func=clerk_user_key,
        storage_uri="memory://",
        strategy="moving-window",
        headers_enabled=True,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    current_user = {"id": "user_a"}

    def auth_dependency(request: Request) -> str:
        request.state.user_id = current_user["id"]
        return current_user["id"]

    def decorate(fn):
        if global_limits:
            fn = limiter.limit(global_limits, key_func=global_key)(fn)
        return limiter.limit(limits)(fn)

    @app.post("/generate")
    @decorate
    async def generate(
        request: Request,
        response: Response,
        user_id: str = Depends(auth_dependency),
    ):
        return {"response": "..."}

    return TestClient(app), current_user


def test_burst_limit_rejects_a_hot_loop():
    client, _ = _app("2/minute")
    client.post("/generate")
    client.post("/generate")

    response = client.post("/generate")

    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_daily_limit_applies_under_the_burst_cap():
    client, _ = _app("10/minute;2/day")
    assert client.post("/generate").status_code == 200
    assert client.post("/generate").status_code == 200

    assert client.post("/generate").status_code == 429


def test_one_users_spend_does_not_lock_out_another():
    client, current_user = _app("1/minute")
    client.post("/generate")
    assert client.post("/generate").status_code == 429

    current_user["id"] = "user_b"
    assert client.post("/generate").status_code == 200


def test_limited_route_reports_its_budget_while_under_the_limit():
    """Regression: with headers_enabled the endpoint must declare a
    `response: Response` parameter. Without it slowapi raises on *every*
    request to the route, turning the limiter into a 500 generator."""
    client, _ = _app("5/minute")

    response = client.post("/generate")

    assert response.status_code == 200
    assert response.headers["x-ratelimit-limit"] == "5"


def test_global_ceiling_stops_spend_that_per_user_limits_allow():
    """Each user stays inside their own quota; together they still have to fit
    under the service's budget."""
    client, current_user = _app("10/minute", global_limits="3/minute")

    current_user["id"] = "user_a"
    assert client.post("/generate").status_code == 200
    assert client.post("/generate").status_code == 200

    # A different account, well within its own 10/minute allowance.
    current_user["id"] = "user_b"
    assert client.post("/generate").status_code == 200
    assert client.post("/generate").status_code == 429


# --- the pre-auth throttle (middleware) -----------------------------------

def _throttled_app(limits="2/minute"):
    """Mirrors main.py's middleware wiring, with its own counters."""
    from limits import parse_many
    from limits.storage import storage_from_string
    from limits.strategies import MovingWindowRateLimiter

    store = storage_from_string("memory://")
    rate_limit._preauth_storage = store
    rate_limit._preauth_limiter = MovingWindowRateLimiter(store)
    rate_limit._preauth_items = parse_many(limits)

    app = FastAPI()
    app.middleware("http")(rate_limit.throttle_by_ip)

    @app.post("/generate")
    async def generate(request: Request):
        return {"response": "..."}

    @app.get("/")
    async def root():
        return {"ok": True}

    return TestClient(app)


@pytest.fixture(autouse=True)
def _restore_throttle_state():
    saved = (
        rate_limit._preauth_storage,
        rate_limit._preauth_limiter,
        rate_limit._preauth_items,
        rate_limit.RATE_LIMIT_FAIL_OPEN,
    )
    yield
    (
        rate_limit._preauth_storage,
        rate_limit._preauth_limiter,
        rate_limit._preauth_items,
        rate_limit.RATE_LIMIT_FAIL_OPEN,
    ) = saved


def test_throttle_rejects_unauthenticated_traffic():
    """Every route is behind a Clerk dependency, so a decorator limit never
    sees a request bearing a forged token — it dies in the dependency, having
    already cost an RSA verification."""
    client = _throttled_app("2/minute")

    assert client.post("/generate").status_code == 200
    assert client.post("/generate").status_code == 200
    assert client.post("/generate").status_code == 429


def test_throttled_request_carries_retry_after():
    client = _throttled_app("1/minute")
    client.post("/generate")

    response = client.post("/generate")

    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) >= 1


def test_health_check_is_exempt():
    client = _throttled_app("1/minute")

    for _ in range(5):
        assert client.get("/").status_code == 200


def test_preflight_is_exempt():
    client = _throttled_app("1/minute")
    client.post("/generate")

    assert client.options("/generate").status_code != 429


def test_throttle_fails_open_when_storage_is_down():
    client = _throttled_app("2/minute")

    class BrokenStorage:
        def test(self, *a, **k):
            raise ConnectionError("redis is gone")

        def hit(self, *a, **k):
            raise ConnectionError("redis is gone")

    rate_limit._preauth_limiter = BrokenStorage()
    rate_limit.RATE_LIMIT_FAIL_OPEN = True

    assert client.post("/generate").status_code == 200
