---
phase: 01-backend-foundation
plan: 01
subsystem: infra
tags: [fastapi, uv, neo4j, redis, docker, pydantic-settings, python]

# Dependency graph
requires: []
provides:
  - uv-managed FastAPI service scaffold at apps/api/
  - Pydantic BaseSettings config system for env var loading
  - Neo4j driver singleton via lifespan asynccontextmanager (app.state)
  - docker-compose.yml with Neo4j 5.20, Redis 7, and API service with healthchecks
  - Domain directory stubs: app/generate/, app/scraper/, app/graph/, app/auth/
affects:
  - 01-02 (graph models and schema — uses apps/api skeleton)
  - 01-03 (scraper — uses apps/api/app/scraper/)
  - 01-04 (auth — uses apps/api/app/auth/, dependencies.py)
  - 01-05 (generation — uses apps/api/app/generate/)

# Tech tracking
tech-stack:
  added:
    - uv (Python package manager, replaces pip/poetry)
    - fastapi[standard]==0.133.0
    - neo4j==5.28.3 (pinned — v6 has breaking changes)
    - openai>=1.40,<2
    - pydantic-settings==2.13.1
    - requests, beautifulsoup4, lxml (scraper deps, used in Plan 03)
    - PyJWT, cryptography (auth deps, used in Plan 04)
    - python-dotenv
    - pytest, pytest-asyncio, httpx (dev)
    - neo4j:5.20-community (Docker)
    - redis:7-alpine (Docker)
  patterns:
    - FastAPI lifespan asynccontextmanager for driver singleton (not deprecated on_event)
    - Neo4j driver stored in app.state — created once at startup, closed on shutdown
    - Pydantic BaseSettings with env_file=".env" for required var enforcement at startup
    - FastAPI Depends injection via request.app.state for driver access
    - uv for dependency management (pyproject.toml + uv.lock)
    - Docker layer caching: copy pyproject.toml + uv.lock before app code

key-files:
  created:
    - apps/api/pyproject.toml
    - apps/api/uv.lock
    - apps/api/.python-version
    - apps/api/.env.example
    - apps/api/Dockerfile
    - apps/api/app/__init__.py
    - apps/api/app/main.py
    - apps/api/app/config.py
    - apps/api/app/dependencies.py
    - apps/api/app/generate/__init__.py
    - apps/api/app/scraper/__init__.py
    - apps/api/app/graph/__init__.py
    - apps/api/app/auth/__init__.py
    - apps/api/tests/__init__.py
    - apps/api/tests/conftest.py
    - docker-compose.yml
  modified: []

key-decisions:
  - "neo4j==5.28.3 pinned (not v6) — v6 has breaking changes: new error hierarchy, explicit .close() required, dropped Python 3.9"
  - "uv init --no-workspace flag required — repo root has pyproject.toml without [project] table"
  - "env_file in docker-compose api service loads developer .env; environment block overrides Neo4j hostnames for compose network"
  - "session_id index created at startup (idempotent) to support per-graph query isolation in later plans"

patterns-established:
  - "Lifespan pattern: all startup/shutdown logic in asynccontextmanager, never @app.on_event"
  - "Singleton pattern: drivers/connections stored in app.state, retrieved via Depends(get_neo4j_driver)"
  - "Config pattern: pydantic-settings BaseSettings with env_file — missing required vars raise ValidationError at startup"
  - "Domain separation: app/generate/, app/scraper/, app/graph/, app/auth/ as subdomain stubs"

requirements-completed: [INFRA-01, INFRA-02, SEC-04]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 1 Plan 01: FastAPI + Neo4j Scaffold Summary

**uv-managed FastAPI service with Neo4j driver singleton via lifespan asynccontextmanager and docker-compose with Neo4j 5.20, Redis 7, and healthchecked service dependencies**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T10:19:30Z
- **Completed:** 2026-02-25T10:22:43Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- FastAPI skeleton at `apps/api/` with uv as package manager — all production and dev deps resolved into uv.lock
- Neo4j driver singleton established via `asynccontextmanager` lifespan — created once at startup, stored in `app.state.neo4j_driver`, closed on shutdown
- Pydantic BaseSettings config — all required env vars declared; missing vars raise error at import time
- docker-compose.yml with Neo4j 5.20-community and Redis 7-alpine, both with healthchecks; API service depends on both with `service_healthy` condition

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold apps/api/ with uv and FastAPI skeleton** - `6419709` (feat)
2. **Task 2: docker-compose.yml with Neo4j, Redis, and API service** - `8cdca43` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `apps/api/pyproject.toml` - uv-managed dependency manifest with neo4j==5.28.3 pinned
- `apps/api/uv.lock` - locked dependency graph for reproducible installs
- `apps/api/.python-version` - pins Python 3.12 for uv
- `apps/api/Dockerfile` - multi-stage build with uv, layer-cached dependencies
- `apps/api/.env.example` - all required env vars documented
- `apps/api/app/main.py` - FastAPI app with lifespan asynccontextmanager, /health endpoint
- `apps/api/app/config.py` - Pydantic BaseSettings for env var loading
- `apps/api/app/dependencies.py` - get_neo4j_driver injector from app.state
- `apps/api/app/generate/__init__.py` - stub for Plan 05 (generation router)
- `apps/api/app/scraper/__init__.py` - stub for Plan 03 (scraper)
- `apps/api/app/graph/__init__.py` - stub for Plan 03 (Neo4j graph operations)
- `apps/api/app/auth/__init__.py` - stub for Plan 04 (Clerk JWT auth)
- `apps/api/tests/conftest.py` - placeholder, fixtures added in Plans 02+
- `docker-compose.yml` - Neo4j + Redis + API with healthchecks and service_healthy dependencies

## Decisions Made

- **neo4j==5.28.3 pinned:** v6 has breaking changes (error hierarchy, .close() semantics, dropped Python 3.9). Pinned per STATE.md decision.
- **uv --no-workspace:** Repo root has an existing pyproject.toml without a [project] table (from the InstaGraph fork). `--no-workspace` prevents uv from trying to merge with it.
- **env_file + environment override in compose:** `env_file` loads developer secrets (OPENAI_API_KEY etc.); `environment` block overrides NEO4J_URI to use the compose service hostname `neo4j:7687`, ensuring correct networking regardless of what's in `.env`.
- **Session_id index at startup:** Created idempotently in the lifespan to ensure Neo4j performance for per-graph queries used in Plan 02+ (CONTEXT.md decision: every node gets session_id for query isolation).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] uv init required --no-workspace flag**
- **Found during:** Task 1 (scaffold step)
- **Issue:** `uv init --app --python 3.12` failed because repo root has a pyproject.toml without a [project] table (leftover from InstaGraph fork). uv tried to join a workspace and failed.
- **Fix:** Added `--no-workspace` flag to `uv init` command.
- **Files modified:** None (flag change during init)
- **Verification:** `uv init --app --python 3.12 --no-workspace` succeeded, project initialized.
- **Committed in:** 6419709 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Single flag addition during init. No scope creep. All planned files created as specified.

## Issues Encountered

None beyond the uv --no-workspace deviation above.

## User Setup Required

None - no external service configuration required in this plan. Developers must copy `.env.example` to `.env` and fill in values before running the API or docker-compose.

## Next Phase Readiness

- Plan 01-02 can proceed immediately: FastAPI skeleton, config, and domain stubs are all in place
- Neo4j driver singleton and dependency injection pattern established — Plan 02 will add graph schema and constraints
- Plan 03 can use `app/scraper/` and `app/graph/` stubs
- Plan 04 can use `app/auth/` stub and `dependencies.py` placeholder
- Plan 05 can use `app/generate/` stub

---
*Phase: 01-backend-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED

All files confirmed present on disk and all commits confirmed in git history.

- FOUND: apps/api/pyproject.toml
- FOUND: apps/api/app/main.py
- FOUND: apps/api/app/config.py
- FOUND: apps/api/app/dependencies.py
- FOUND: docker-compose.yml
- FOUND: 01-01-SUMMARY.md
- FOUND: commit 6419709 (Task 1)
- FOUND: commit 8cdca43 (Task 2)
