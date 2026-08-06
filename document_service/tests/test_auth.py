"""
Tests for the Clerk token verification dependency (SEC-2).

These use a locally generated RSA keypair and stub out the JWKS fetch, so they
run offline with no Clerk instance and no network.

    cd document_service && pytest tests/ -v
"""
import base64
import hashlib
import hmac
import json
import time
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core import auth

ISSUER = "https://example.clerk.accounts.dev"
AZP = "http://localhost:3000"
USER_ID = "user_2abcDEF123"


@pytest.fixture(scope="module")
def keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


@pytest.fixture(autouse=True)
def stub_jwks(monkeypatch, keypair):
    """Bypass the network JWKS fetch; hand back our local public key."""
    _, public_key = keypair

    class _FakeSigningKey:
        key = public_key

    class _FakeJWKSClient:
        def get_signing_key_from_jwt(self, token):
            return _FakeSigningKey()

    monkeypatch.setattr(auth, "_jwks_client", lambda: _FakeJWKSClient())


def make_token(keypair, **overrides):
    private_key, _ = keypair
    now = int(time.time())
    payload = {
        "sub": USER_ID,
        "iss": ISSUER,
        "azp": AZP,
        "iat": now,
        "exp": now + 60,
    }
    payload.update(overrides)
    for key in [k for k, v in payload.items() if v is None]:
        del payload[key]
    return jwt.encode(payload, private_key, algorithm="RS256")


def public_pem(keypair) -> bytes:
    """The public key as PEM — the form an attacker lifts from a JWKS endpoint."""
    _, public_key = keypair
    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )


def public_der(keypair) -> bytes:
    """The same public key as DER — see `test_algorithm_confusion_rejected`."""
    _, public_key = keypair
    return public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )


def stub_signing_key(monkeypatch, key):
    """
    Re-point the JWKS stub at *key*, overriding the autouse fixture.

    Lets a test choose the form the signing key arrives in, which decides
    whether PyJWT's own HMAC key guards fire before this service's checks do.

    :param monkeypatch: The pytest monkeypatch fixture.
    :param key: What `get_signing_key_from_jwt(...).key` should return.
    """
    class _FakeSigningKey:
        pass

    _FakeSigningKey.key = key

    class _FakeJWKSClient:
        def get_signing_key_from_jwt(self, token):
            return _FakeSigningKey()

    monkeypatch.setattr(auth, "_jwks_client", lambda: _FakeJWKSClient())


def _b64url_encode(raw: bytes) -> bytes:
    return base64.urlsafe_b64encode(raw).rstrip(b"=")


def _b64url_decode(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


def forge_hs256(payload: dict, secret: bytes) -> str:
    """
    Build an HS256 token by hand, signing *payload* with *secret*.

    Deliberately not `jwt.encode`: PyJWT refuses to use a PEM-encoded
    asymmetric key as an HMAC secret, which is a guard on its own API and says
    nothing about what this service accepts. An attacker mounting algorithm
    confusion has no such scruples — they assemble the token directly, which is
    what this does.

    :param payload: Claims to sign.
    :param secret: HMAC key — here, the server's own public key.
    :return: An encoded JWT.
    """
    header = _b64url_encode(
        json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode()
    )
    body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = header + b"." + body
    signature = _b64url_encode(
        hmac.new(secret, signing_input, hashlib.sha256).digest()
    )
    return (signing_input + b"." + signature).decode()


def fake_request():
    """Stand-in for the Request the dependency stashes `user_id` on."""
    return SimpleNamespace(state=SimpleNamespace())


def verify(token, request=None):
    return auth.get_current_user_id(
        request if request is not None else fake_request(),
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
    )


# --- the happy path -------------------------------------------------------

def test_valid_token_returns_clerk_user_id(keypair):
    assert verify(make_token(keypair)) == USER_ID


def test_valid_token_publishes_the_user_id_on_request_state(keypair):
    """The rate limiter keys buckets off request.state.user_id (SEC-12). If this
    stops being set, limiting silently degrades to per-IP instead of failing."""
    request = fake_request()
    verify(make_token(keypair), request)

    assert request.state.user_id == USER_ID


def test_rejected_token_leaves_no_user_id_on_state(keypair):
    """An unverified `sub` must never reach the limiter."""
    request = fake_request()
    with pytest.raises(HTTPException):
        verify(make_token(keypair, iss="https://attacker.example"), request)

    assert not hasattr(request.state, "user_id")


# --- rejection cases ------------------------------------------------------

def test_expired_token_rejected(keypair):
    now = int(time.time())
    with pytest.raises(HTTPException) as exc:
        verify(make_token(keypair, iat=now - 300, exp=now - 60))
    assert exc.value.status_code == 401


def test_wrong_issuer_rejected(keypair):
    with pytest.raises(HTTPException) as exc:
        verify(make_token(keypair, iss="https://attacker.example"))
    assert exc.value.status_code == 401


def test_unexpected_azp_rejected(keypair):
    """A token minted for a different app must not be replayable here."""
    with pytest.raises(HTTPException) as exc:
        verify(make_token(keypair, azp="https://evil.example"))
    assert exc.value.status_code == 401


def test_missing_sub_rejected(keypair):
    with pytest.raises(HTTPException) as exc:
        verify(make_token(keypair, sub=None))
    assert exc.value.status_code == 401


def test_garbage_token_rejected():
    with pytest.raises(HTTPException) as exc:
        verify("not-a-jwt")
    assert exc.value.status_code == 401


def test_token_signed_with_wrong_key_rejected(keypair):
    """Signature must actually be checked against the JWKS key."""
    attacker_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = int(time.time())
    forged = jwt.encode(
        {"sub": "user_attacker", "iss": ISSUER, "azp": AZP,
         "iat": now, "exp": now + 60},
        attacker_key,
        algorithm="RS256",
    )
    with pytest.raises(HTTPException) as exc:
        verify(forged)
    assert exc.value.status_code == 401


def test_algorithm_confusion_rejected(monkeypatch, keypair):
    """
    The classic JWT attack: the RSA public key is public, so an attacker signs a
    token with HS256 using those key bytes as the HMAC secret. A verifier that
    reads the algorithm out of the token's own header then hands the JWKS key to
    HMAC will accept it. `algorithms=["RS256"]` in auth.py is what stops it.

    The signing key is stubbed in **DER** form on purpose. PyJWT independently
    refuses PEM-shaped secrets and key objects for HMAC, and either guard fires
    before this service's algorithm pin is consulted — so with those forms this
    test passes even when the pin is deleted, proving nothing about our code.
    DER slips past both, which leaves the pin as the only thing standing.
    Confirmed by removing the pin and watching this test fail.
    """
    der = public_der(keypair)
    stub_signing_key(monkeypatch, der)

    now = int(time.time())
    forged = forge_hs256(
        {"sub": "user_attacker", "iss": ISSUER, "azp": AZP,
         "iat": now, "exp": now + 60},
        der,
    )

    with pytest.raises(HTTPException) as exc:
        verify(forged)
    assert exc.value.status_code == 401


def test_algorithm_confusion_forgery_is_genuinely_signed(keypair):
    """
    Guards the test above. If the forgery were malformed, the 401 it asserts
    would show only that this service rejects junk — not that it rejects a
    *well-formed* HS256 token keyed on a public key anyone can fetch.
    """
    now = int(time.time())
    secret = public_der(keypair)
    forged = forge_hs256(
        {"sub": "user_attacker", "iss": ISSUER, "azp": AZP,
         "iat": now, "exp": now + 60},
        secret,
    )

    header_b64, payload_b64, signature_b64 = forged.split(".")

    assert json.loads(_b64url_decode(header_b64))["alg"] == "HS256"
    assert json.loads(_b64url_decode(payload_b64))["sub"] == "user_attacker"
    expected = hmac.new(
        secret, f"{header_b64}.{payload_b64}".encode(), hashlib.sha256
    ).digest()
    assert hmac.compare_digest(_b64url_decode(signature_b64), expected)


def test_pem_shaped_hmac_secret_rejected_by_the_library(monkeypatch, keypair):
    """
    Defense in depth, and an upgrade canary.

    This asserts PyJWT's behaviour rather than ours: it refuses a PEM-shaped
    HMAC secret whatever algorithms we allow. That guard is why the DER form
    above is needed to test our own pin. If a PyJWT upgrade ever drops it, this
    test fails and the layer we lost is named rather than silently gone.
    """
    pem = public_pem(keypair)
    stub_signing_key(monkeypatch, pem)

    now = int(time.time())
    forged = forge_hs256(
        {"sub": "user_attacker", "iss": ISSUER, "azp": AZP,
         "iat": now, "exp": now + 60},
        pem,
    )

    with pytest.raises(HTTPException) as exc:
        verify(forged)
    assert exc.value.status_code == 401


def test_jwks_failure_fails_closed(monkeypatch, keypair):
    """A JWKS outage must 401, never fall through to allowing the request."""
    class _BrokenClient:
        def get_signing_key_from_jwt(self, token):
            raise ConnectionError("JWKS unreachable")

    monkeypatch.setattr(auth, "_jwks_client", lambda: _BrokenClient())
    with pytest.raises(HTTPException) as exc:
        verify(make_token(keypair))
    assert exc.value.status_code == 401
