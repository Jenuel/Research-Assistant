"""Covers SEC-12: rate limiting on the document service.

These test *our* wiring of slowapi — the key functions, the config resolution,
the pre-auth middleware, and that limited routes actually return 429 — not
slowapi's own window bookkeeping, which is its maintainers' job to test.
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


# --- the per-user key function --------------------------------------------

def test_key_is_the_clerk_user_when_authenticated():
    assert clerk_user_key(_request(user_id="user_abc")) == "user:user_abc"


def test_different_users_get_different_buckets():
    assert clerk_user_key(_request(user_id="user_a")) != clerk_user_key(
        _request(user_id="user_b")
    )


def test_same_user_from_different_ips_shares_one_bucket():
    """Keying on the Clerk sub, not IP — rotating IPs must not reset the limit."""
    assert clerk_user_key(_request("user_a", "203.0.113.7")) == clerk_user_key(
        _request("user_a", "198.51.100.9")
    )


def test_falls_back_to_ip_when_unauthenticated():
    key = clerk_user_key(_request(user_id=None))

    assert key.startswith("ip:")
    # Never a constant: one shared anonymous bucket would let a single client
    # lock out everyone else.
    assert key != clerk_user_key(_request(None, client_host="198.51.100.9"))


# --- the pre-auth key function --------------------------------------------

def test_ip_key_ignores_a_claimed_user_id():
    """client_ip_key runs in middleware, before any token has been verified.
    Trusting request.state there would let a caller pick their own bucket."""
    assert client_ip_key(_request(user_id="user_a", client_host="203.0.113.7")) == (
        client_ip_key(_request(user_id=None, client_host="203.0.113.7"))
    )


def test_ip_key_separates_distinct_clients():
    assert client_ip_key(_request(client_host="203.0.113.7")) != client_ip_key(
        _request(client_host="198.51.100.9")
    )


def test_global_key_is_shared_by_every_caller():
    """The one place a constant key is correct: an app-wide ceiling."""
    assert global_key(_request("user_a", "203.0.113.7")) == global_key(
        _request("user_b", "198.51.100.9")
    )


# --- config resolution ----------------------------------------------------

def test_limits_default_when_unset(monkeypatch):
    monkeypatch.delenv("UPLOAD_RATE_LIMITS", raising=False)
    assert resolve_rate_limits("UPLOAD_RATE_LIMITS", "20/minute") == "20/minute"


def test_valid_limit_string_is_used(monkeypatch):
    monkeypatch.setenv("UPLOAD_RATE_LIMITS", "5/minute")
    assert resolve_rate_limits("UPLOAD_RATE_LIMITS", "20/minute") == "5/minute"


def test_multiple_windows_are_accepted(monkeypatch):
    monkeypatch.setenv("UPLOAD_RATE_LIMITS", "5/minute;100/day")
    assert resolve_rate_limits("UPLOAD_RATE_LIMITS", "20/minute") == "5/minute;100/day"


@pytest.mark.parametrize("value", ["", "   ", "lots", "20", "20/fortnight", "-5/minute"])
def test_malformed_limit_never_means_unlimited(monkeypatch, value):
    monkeypatch.setenv("UPLOAD_RATE_LIMITS", value)
    assert resolve_rate_limits("UPLOAD_RATE_LIMITS", "20/minute") == "20/minute"


@pytest.mark.parametrize(
    "name", ["UPLOAD_RATE_LIMITS", "READ_RATE_LIMITS", "DELETE_RATE_LIMITS",
             "PREAUTH_RATE_LIMITS"]
)
def test_configured_limits_are_parseable(name):
    from limits import parse_many

    assert parse_many(getattr(rate_limit, name))


def test_strategy_is_a_moving_window_by_default():
    """A fixed window lets a client spend its whole allowance either side of a
    boundary — a 2x burst the limit string does not reveal."""
    assert rate_limit.RATE_LIMIT_STRATEGY == "moving-window"


@pytest.mark.parametrize(
    "raw,expected",
    [("true", True), ("1", True), ("on", True),
     ("false", False), ("0", False), ("off", False)],
)
def test_flags_accept_the_usual_spellings(monkeypatch, raw, expected):
    monkeypatch.setenv("SOME_FLAG", raw)
    assert rate_limit._resolve_flag("SOME_FLAG", not expected) is expected


def test_unparseable_flag_falls_back(monkeypatch):
    monkeypatch.setenv("SOME_FLAG", "perhaps")
    assert rate_limit._resolve_flag("SOME_FLAG", True) is True


# --- end-to-end through a limited route -----------------------------------

def _app(limits="2/minute"):
    """Mirrors main.py's wiring, with a fresh limiter so tests don't share
    counters."""
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

    @app.post("/upload")
    @limiter.limit(limits)
    async def upload(
        request: Request,
        response: Response,
        user_id: str = Depends(auth_dependency),
    ):
        return {"ok": True}

    return TestClient(app), current_user


def test_requests_under_the_limit_pass():
    client, _ = _app("2/minute")

    assert client.post("/upload").status_code == 200
    assert client.post("/upload").status_code == 200


def test_request_over_the_limit_gets_429():
    client, _ = _app("2/minute")
    client.post("/upload")
    client.post("/upload")

    assert client.post("/upload").status_code == 429


def test_429_tells_the_client_when_to_retry():
    """headers_enabled=True on the Limiter; without it slowapi sends a bare
    429 with no Retry-After."""
    client, _ = _app("1/minute")
    client.post("/upload")

    response = client.post("/upload")

    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_limited_route_reports_its_budget_while_under_the_limit():
    """Regression: with headers_enabled the endpoint must declare a
    `response: Response` parameter. Without it slowapi raises on *every*
    request to the route, turning the limiter into a 500 generator."""
    client, _ = _app("5/minute")

    response = client.post("/upload")

    assert response.status_code == 200
    assert response.headers["x-ratelimit-limit"] == "5"


def test_one_users_limit_does_not_lock_out_another():
    client, current_user = _app("1/minute")
    client.post("/upload")
    assert client.post("/upload").status_code == 429

    current_user["id"] = "user_b"
    assert client.post("/upload").status_code == 200


def test_both_windows_are_enforced():
    """The tighter window rejects first; the wider one still applies."""
    client, _ = _app("10/minute;2/day")
    assert client.post("/upload").status_code == 200
    assert client.post("/upload").status_code == 200

    # Under the per-minute cap of 10, but over the daily cap of 2.
    assert client.post("/upload").status_code == 429


# --- the pre-auth throttle (middleware) -----------------------------------

def _throttled_app(limits="2/minute", storage="memory://"):
    """Mirrors main.py's middleware wiring. Rebuilds the module-level throttle
    state so each test gets its own counters."""
    from limits import parse_many
    from limits.storage import storage_from_string
    from limits.strategies import MovingWindowRateLimiter

    store = storage_from_string(storage)
    rate_limit._preauth_storage = store
    rate_limit._preauth_limiter = MovingWindowRateLimiter(store)
    rate_limit._preauth_items = parse_many(limits)

    app = FastAPI()
    app.middleware("http")(rate_limit.throttle_by_ip)

    # No auth dependency anywhere: the point of this layer is that it works on
    # requests that never reach one.
    @app.post("/upload")
    async def upload(request: Request):
        return {"ok": True}

    @app.get("/")
    async def root():
        return {"ok": True}

    return TestClient(app)


@pytest.fixture(autouse=True)
def _restore_throttle_state():
    """The throttle's storage is module-level; put it back after each test."""
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
    """The whole point of this layer. Every route is behind a Clerk dependency,
    so a decorator limit never sees a request bearing a forged token — it dies
    in the dependency, having already cost an RSA verification."""
    client = _throttled_app("2/minute")

    assert client.post("/upload").status_code == 200
    assert client.post("/upload").status_code == 200
    assert client.post("/upload").status_code == 429


def test_throttled_request_carries_retry_after():
    client = _throttled_app("1/minute")
    client.post("/upload")

    response = client.post("/upload")

    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) >= 1


def test_throttle_does_not_read_the_request_body():
    """A rejected upload must not be spooled or parsed — otherwise the 429
    saves the database write and nothing else, and bandwidth stays exposed."""
    client = _throttled_app("1/minute")
    client.post("/upload", content=b"x" * 1024)

    response = client.post("/upload", content=b"y" * (5 * 1024 * 1024))

    assert response.status_code == 429


def test_health_check_is_exempt():
    """Orchestrators poll it from one address and would consume that address's
    entire budget."""
    client = _throttled_app("1/minute")

    for _ in range(5):
        assert client.get("/").status_code == 200


def test_preflight_is_exempt():
    """A throttled OPTIONS surfaces in the browser as an opaque CORS failure
    rather than a readable 429."""
    client = _throttled_app("1/minute")
    client.post("/upload")

    assert client.options("/upload").status_code != 429


def test_throttle_fails_open_when_storage_is_down():
    """A Redis blip must not take the service down."""
    client = _throttled_app("2/minute")

    class BrokenStorage:
        def test(self, *a, **k):
            raise ConnectionError("redis is gone")

        def hit(self, *a, **k):
            raise ConnectionError("redis is gone")

    rate_limit._preauth_limiter = BrokenStorage()
    rate_limit.RATE_LIMIT_FAIL_OPEN = True

    assert client.post("/upload").status_code == 200


def test_throttle_can_fail_closed():
    """The alternative policy, for when enforcement outranks uptime."""
    client = _throttled_app("2/minute")

    class BrokenStorage:
        def test(self, *a, **k):
            raise ConnectionError("redis is gone")

        def hit(self, *a, **k):
            raise ConnectionError("redis is gone")

    rate_limit._preauth_limiter = BrokenStorage()
    rate_limit.RATE_LIMIT_FAIL_OPEN = False

    with pytest.raises(ConnectionError):
        client.post("/upload")
