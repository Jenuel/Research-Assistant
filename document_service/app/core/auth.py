import os
from functools import lru_cache

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

from app.core.logging import get_logger

load_dotenv()

logger = get_logger(__name__)

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
CLERK_ISSUER = os.getenv("CLERK_ISSUER")
CLERK_AUTHORIZED_PARTIES = [
    p.strip() for p in os.getenv("CLERK_AUTHORIZED_PARTIES", "").split(",") if p.strip()
]

if not CLERK_JWKS_URL or not CLERK_ISSUER:
    raise RuntimeError(
        "CLERK_JWKS_URL and CLERK_ISSUER must be set. Refusing to start: "
        "without them, token verification cannot be enforced."
    )

bearer_scheme = HTTPBearer(auto_error=True)


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    logger.info("Initializing Clerk JWKS client")
    return PyJWKClient(CLERK_JWKS_URL, cache_keys=True, lifespan=300)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """
    Verify a Clerk session token and return the Clerk user ID (the `sub` claim).

    Raises 401 on any failure. Never returns None — a route that depends on this
    is guaranteed an authenticated caller.
    """
    token = credentials.credentials

    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            leeway=5,
            options={
                "verify_aud": False,
                "require": ["exp", "iat", "sub", "iss"],
            },
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Rejected token: {type(e).__name__}")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    except Exception as e:
        logger.error(f"Token verification error: {type(e).__name__}")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Could not verify token")

    azp = payload.get("azp")
    if CLERK_AUTHORIZED_PARTIES and azp not in CLERK_AUTHORIZED_PARTIES:
        logger.warning(f"Rejected token with unexpected azp={azp!r}")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token audience")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing subject")

    return user_id
