---
phase: 01-backend-foundation
plan: 04
subsystem: auth
tags: [fastapi, clerk, jwt, pyjwt, pyjwkclient, rs256, security]

# Dependency graph
requires:
  - 01-01 (FastAPI scaffold, app/auth/ stub, dependencies.py, config.py with clerk settings)
provides:
  - get_current_user FastAPI dependency (RS256 JWT validation via Clerk JWKS)
  - Unified re-export point in dependencies.py for all shared route deps
affects:
  - 01-05 (generate endpoint uses Depends(get_current_user) for SEC-03)

# Tech tracking
tech-stack:
  added:
    - PyJWT (already in pyproject.toml from Plan 01 — now actually used)
    - cryptography (already in pyproject.toml from Plan 01 — RSA key support for PyJWT)
  patterns:
    - PyJWKClient lazy singleton with cache_keys=True (JWKS auto key-rotation)
    - HTTPBearer(auto_error=False) — missing token returns 401 not 422 validation error
    - Comma-separated CLERK_AUTHORIZED_PARTY for multi-environment azp validation
    - Catch-all except Exception for JWKS network failures (returns 401 not 500)
    - Re-export pattern in dependencies.py via noqa F401 for single import point

key-files:
  created:
    - apps/api/app/auth/clerk.py
  modified:
    - apps/api/app/dependencies.py

key-decisions:
  - "Manual PyJWT + PyJWKClient approach chosen over fastapi-clerk-auth (v0.0.9, low-activity) and clerk-backend-api SDK (expects httpx.Request, incompatible with FastAPI starlette.Request)"
  - "HTTPBearer(auto_error=False) — missing Authorization header returns 401 with standard error shape, not FastAPI 422 validation error"
  - "catch-all except Exception intentional — JWKS network failures (Clerk outage) return 401 not 500 to avoid leaking infra details"
  - "comma-separated CLERK_AUTHORIZED_PARTY supports localhost:3000 and production domain in single env var"

requirements-completed: [SEC-03]

# Metrics
duration: 1min
completed: 2026-02-25
---

# Phase 1 Plan 04: Clerk JWT Authentication Summary

**Clerk JWT verification FastAPI dependency using PyJWT + PyJWKClient with RS256 signature validation, expiry checking, and azp claim enforcement**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-25T10:26:08Z
- **Completed:** 2026-02-25T10:27:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `apps/api/app/auth/clerk.py` — `get_current_user` FastAPI dependency validates RS256-signed Clerk JWTs via `PyJWKClient` fetching Clerk's JWKS endpoint; validates signature, expiry, and `azp` claim
- `apps/api/app/dependencies.py` — updated to re-export `get_current_user` alongside `get_neo4j_driver`, giving all routers a single unified import point

## Task Commits

Each task was committed atomically:

1. **Task 1: Clerk JWT dependency with PyJWT fallback pattern** - `03b4ca6` (feat)
2. **Task 2: Wire get_current_user into dependencies.py** - `ff3b7b7` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `apps/api/app/auth/clerk.py` - Created: get_current_user async dependency, PyJWKClient lazy singleton, HTTPBearer(auto_error=False), azp claim validation, standard 401 error shapes
- `apps/api/app/dependencies.py` - Modified: added re-export of get_current_user from app.auth.clerk with noqa F401, usage comment for protected routes

## Decisions Made

- **Manual PyJWT over SDK:** `fastapi-clerk-auth` is v0.0.9 with minimal activity (flagged in STATE.md). `clerk-backend-api.authenticate_request()` expects `httpx.Request` but FastAPI provides `starlette.Request` — incompatible. Manual PyJWT + PyJWKClient has zero third-party coupling, full control over claims.
- **HTTPBearer(auto_error=False):** FastAPI's default `auto_error=True` raises a 422 validation error on missing Authorization header. `auto_error=False` returns `None`, allowing explicit 401 with the standard `{"error": "unauthorized", ...}` shape.
- **Catch-all except Exception:** Intentional — JWKS network failures (Clerk down) should return 401, not 500. Avoids leaking infrastructure details.
- **Comma-separated CLERK_AUTHORIZED_PARTY:** Single env var supports multiple origins: `http://localhost:3000,https://app.graphvc.com` for local + production without separate configs.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before running the API, the following environment variables must be set in `apps/api/.env`:

| Variable | Source |
|---|---|
| `CLERK_SECRET_KEY` | Clerk Dashboard -> Configure -> API Keys -> Secret keys |
| `CLERK_AUTHORIZED_PARTY` | Frontend origin URL (e.g., `http://localhost:3000` for local dev, `https://your-app.vercel.app` for production) |
| `CLERK_FRONTEND_API` | Clerk Dashboard -> Configure -> API Keys -> Frontend API (format: `your-instance.clerk.accounts.dev`) |

## Next Phase Readiness

- Plan 01-05 can use `Depends(get_current_user)` from `app.dependencies` to protect the generate endpoint
- Import pattern: `from app.dependencies import get_neo4j_driver, get_current_user`
- JWT payload contains `sub` (Clerk user ID) for associating generated graphs with users

---
*Phase: 01-backend-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED

All files confirmed present on disk and all commits confirmed in git history.

- FOUND: apps/api/app/auth/clerk.py
- FOUND: apps/api/app/dependencies.py
- FOUND: .planning/phases/01-backend-foundation/01-04-SUMMARY.md
- FOUND: commit 03b4ca6 (Task 1)
- FOUND: commit ff3b7b7 (Task 2)
