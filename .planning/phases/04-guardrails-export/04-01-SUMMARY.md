---
phase: 04-guardrails-export
plan: 01
subsystem: api
tags: [upstash, redis, rate-limiting, caching, byok, openai]

requires:
  - phase: 01-backend-foundation
    provides: FastAPI app, generate pipeline, scraper, config/Settings pattern
  - phase: 03-auth-persistence
    provides: Clerk auth, Supabase persistence, get_optional_user dependency
provides:
  - Multi-tier rate limiter (anon=1/day, auth=3/day) via Upstash Redis FixedWindow
  - URL scrape cache with SHA-256 keys and 1-hour TTL
  - BYOK support via X-OpenAI-Key header (bypasses rate limit)
  - GET /api/usage endpoint returning used/limit/reset
  - cache_hit and cache_age_seconds in GenerateMeta response
affects: [04-guardrails-export, frontend-usage-counter]

tech-stack:
  added: [upstash-redis 1.6.0, upstash-ratelimit 1.1.0]
  patterns: [HTTP-based Redis singleton in lifespan, None-safe graceful degradation, per-request limiter construction]

key-files:
  created:
    - apps/api/app/ratelimit/__init__.py
    - apps/api/app/ratelimit/limiter.py
    - apps/api/app/ratelimit/cache.py
    - apps/api/app/ratelimit/router.py
  modified:
    - apps/api/pyproject.toml
    - apps/api/app/config.py
    - apps/api/app/main.py
    - apps/api/app/dependencies.py
    - apps/api/app/generate/router.py
    - apps/api/app/generate/service.py
    - apps/api/app/generate/schemas.py
    - packages/shared-types/src/index.ts

key-decisions:
  - "get_remaining/get_reset SDK methods used for usage peek (not remaining() which doesn't exist in upstash-ratelimit 1.1.0)"
  - "get_optional_user used for /api/usage endpoint (not get_current_user) to support anonymous usage queries"
  - "Transient OpenAI client for BYOK — never stored as singleton, never logged"

patterns-established:
  - "Redis singleton via app.state.redis in lifespan — HTTP-based, no shutdown needed"
  - "None-safe pattern: all ratelimit/cache functions accept redis=None and no-op gracefully"
  - "_build_limiters() per-request — Ratelimit objects are lightweight config wrappers"

requirements-completed: [RATE-01, RATE-03, AI-02]

duration: 10min
completed: 2026-02-27
---

# Phase 4 Plan 1: Rate Limiting + URL Cache + BYOK Summary

**Multi-tier rate limiting (anon=1/day, auth=3/day) with Upstash Redis FixedWindow, SHA-256 URL scrape cache with 1-hour TTL, and BYOK OpenAI key bypass**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-27T16:41:06Z
- **Completed:** 2026-02-27T16:51:41Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Upstash Redis singleton with graceful degradation (None when unconfigured)
- Rate limiter enforcing anon=1/day, auth=3/day via FixedWindow(86400) with 429 + Retry-After
- URL scrape cache: SHA-256 keyed, 1-hour TTL, cache-before-scrape pattern in generate pipeline
- BYOK: X-OpenAI-Key header bypasses rate limit, creates transient OpenAI client (never logged)
- GET /api/usage returns {used, limit, reset} without consuming a request
- GenerateMeta extended with cache_hit and cache_age_seconds (Python + TypeScript shared-types)

## Task Commits

Each task was committed atomically:

1. **Task 1: Upstash Redis singleton + rate limiter module + URL cache module + config** - `d362a4c` (feat)
2. **Task 2: Wire rate limit + URL cache + BYOK into generate pipeline** - `c33fde9` (feat)

## Files Created/Modified
- `apps/api/app/ratelimit/__init__.py` - Package init
- `apps/api/app/ratelimit/limiter.py` - check_rate_limit (429 on exceed) and get_usage (peek without consuming)
- `apps/api/app/ratelimit/cache.py` - get_cached_scrape and cache_scrape with SHA-256 URL keys
- `apps/api/app/ratelimit/router.py` - GET /api/usage endpoint
- `apps/api/pyproject.toml` - Added upstash-redis, upstash-ratelimit dependencies
- `apps/api/app/config.py` - Added upstash_redis_rest_url and upstash_redis_rest_token settings
- `apps/api/app/main.py` - Redis singleton in lifespan, ratelimit router registration
- `apps/api/app/dependencies.py` - get_redis_client dependency
- `apps/api/app/generate/router.py` - Rate limit check, BYOK header extraction, redis/force_refresh wiring
- `apps/api/app/generate/service.py` - URL cache integration, BYOK client, cache_hit/cache_age in meta
- `apps/api/app/generate/schemas.py` - cache_hit, cache_age_seconds on GenerateMeta; force_refresh on GenerateRequest
- `packages/shared-types/src/index.ts` - cache_hit, cache_age_seconds on GenerateMeta interface

## Decisions Made
- Used `get_remaining()` and `get_reset()` SDK methods for usage peek instead of `remaining()` (which doesn't exist in upstash-ratelimit 1.1.0 Python SDK)
- Used `get_optional_user` (not `get_current_user`) for /api/usage endpoint to support anonymous usage queries
- BYOK creates a transient OpenAI client per request -- never stored as module-level singleton, never logged in request_log or Sentry

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] uv sync flag changed from --no-workspace to --no-install-workspace**
- **Found during:** Task 1
- **Issue:** `uv sync --no-workspace` is no longer valid; flag was renamed to `--no-install-workspace`
- **Fix:** Used `uv sync --no-install-workspace` instead
- **Verification:** Dependencies installed successfully

**2. [Rule 1 - Bug] SDK API mismatch: remaining() does not exist**
- **Found during:** Task 1 (limiter.py implementation)
- **Issue:** Plan referenced `limiter.remaining(identifier)` but SDK has `get_remaining(identifier)` and `get_reset(identifier)` as separate methods
- **Fix:** Used `get_remaining()` and `get_reset()` methods instead, returning int and float respectively
- **Verification:** Import test passes, method signatures confirmed via inspect

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing test failure: `test_generate_rejects_missing_auth` fails (returns 200 instead of 401) -- this is a pre-existing issue with the auth mock, not caused by this plan's changes. Logged to deferred items.

## User Setup Required
None - Upstash Redis is optional (graceful degradation). To enable rate limiting, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment variables.

## Next Phase Readiness
- Rate limiting infrastructure ready for frontend usage counter (Plan 02)
- URL cache active when Redis is configured
- BYOK header ready for frontend "Use your own key" flow

---
*Phase: 04-guardrails-export*
*Completed: 2026-02-27*
