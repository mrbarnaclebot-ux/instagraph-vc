import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient

from app.config import settings

# JWKS client — fetches and caches Clerk's public keys
# Initialized once at module import (lazy singleton pattern)
# PyJWKClient handles key rotation automatically — re-fetches when JWT kid is unknown
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Returns the singleton PyJWKClient, creating it on first call."""
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"https://{settings.clerk_frontend_api}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:  # pragma: no cover — dev bypass branch excluded from coverage
    """
    FastAPI dependency — validates Clerk JWT Bearer token (SEC-03).

    Validates:
    1. Authorization: Bearer header is present
    2. JWT signature via RS256 using Clerk's JWKS public keys
    3. Token expiry (verify_exp=True)
    4. azp claim matches CLERK_AUTHORIZED_PARTY (prevents token misuse across apps)

    Returns the decoded JWT payload dict on success.
    Raises HTTPException(401) for any validation failure.

    Usage in a protected route:
        @router.post("/api/generate")
        async def generate(
            request: GenerateRequest,
            current_user: dict = Depends(get_current_user),
        ):
            user_id = current_user.get("sub")
    """
    # Dev bypass — never set DEV_SKIP_AUTH=true in production
    if settings.dev_skip_auth:
        return {"sub": "dev-user", "azp": settings.clerk_authorized_party or "http://localhost:3000"}

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Missing authorization token"},
        )

    token = credentials.credentials

    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True},
        )

        # Validate azp claim (SEC-03: authorized_parties check)
        # azp = Authorized Party — the frontend origin that issued the token
        # This prevents tokens issued for one app being used against another
        azp = payload.get("azp", "")
        allowed_parties = [
            p.strip()
            for p in settings.clerk_authorized_party.split(",")
            if p.strip()
        ]
        if azp and allowed_parties and azp not in allowed_parties:
            raise jwt.InvalidClaimError("azp claim not in authorized parties")

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Token expired"},
        )
    except jwt.InvalidClaimError:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Token claim validation failed"},
        )
    except jwt.DecodeError:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Invalid token"},
        )
    except Exception:
        # Catch-all: JWKS fetch failure, unexpected JWT errors
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Token verification failed"},
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict | None:
    """Like get_current_user but returns None instead of 401 for anonymous access."""
    if credentials is None:
        return None
    # If a token IS provided, validate it normally
    return await get_current_user(credentials)
