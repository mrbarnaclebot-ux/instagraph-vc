---
phase: 03-auth-persistence
plan: "04"
subsystem: api
tags: [neo4j, supabase, ownership, request-logging, graph-persistence, user-id, fastapi]

# Dependency graph
requires:
  - phase: 03-02
    provides: Supabase client singleton in app.state + get_supabase_client dependency

provides:
  - persist_graph() with user_id/created_by/created_at Neo4j node fields (AI-05)
  - _auto_title() auto-naming for graphs from URL domain or text truncation
  - run_generate_pipeline() with user_id + supabase params; saves graphs table row (AUTH-03)
  - POST /api/generate logs every call to request_log table fire-and-forget (AUTH-04)

affects:
  - 04-graph-history
  - Any phase that queries Neo4j nodes by ownership (created_by field)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fire-and-forget Supabase writes: try/except pass, never block API response
    - user_id default "anonymous" pattern: optional auth, works for trial users
    - _auto_title() strategy: URL = domain + date, text = 60-char truncation

key-files:
  created: []
  modified:
    - apps/api/app/graph/repository.py
    - apps/api/app/generate/service.py
    - apps/api/app/generate/router.py

key-decisions:
  - "user_id default 'anonymous' — persist_graph works for both authed and trial users without branching"
  - "Fire-and-forget pattern for all Supabase writes — try/except pass ensures Neo4j response always returns"
  - "Auto-title: URL inputs use domain+date ('techcrunch.com · Feb 27'), text inputs use first 60 chars with ellipsis"
  - "processing_ms in request_log is router-level timing (total handler time) vs meta.processing_ms (pipeline-only) — acceptable discrepancy for billing/debug use"
  - "graphs row only inserted for user_id != 'anonymous' — anonymous trial graphs not tracked in Supabase"

patterns-established:
  - "Fire-and-forget Supabase writes: always wrap in try/except with bare pass, placed after main response logic"
  - "user_id extracted from current_user.get('sub', 'anonymous') — sub is Clerk's standard JWT claim"
  - "Supabase dependency injected via get_supabase_client() from dependencies.py — never instantiated in route handler"

requirements-completed:
  - AI-05
  - AUTH-03
  - AUTH-04

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 3 Plan 04: Graph Ownership + Supabase Persistence Summary

**Neo4j nodes stamped with created_by+created_at per user, Supabase graphs table saved per authenticated generation, and every POST /api/generate fire-and-forget logged to request_log**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T08:18:35Z
- **Completed:** 2026-02-27T08:21:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Neo4j Entity nodes now carry `created_by` (Clerk user_id or "anonymous") and `created_at: datetime()` fields — enables per-user graph ownership queries (AI-05)
- `run_generate_pipeline()` saves a row to Supabase `graphs` table with title, source_url, node/edge counts, and neo4j_session_id for authenticated users (AUTH-03)
- `POST /api/generate` logs every call to `request_log` with user_id, endpoint, ip, status_code, tokens_used, and processing_ms (AUTH-04)
- All Supabase writes are fire-and-forget — a Supabase failure can never block the Neo4j graph response
- `_auto_title()` generates "domain · Feb 27" for URL inputs and 60-char truncated text for paste inputs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add created_by field to Neo4j persist_graph (AI-05)** - `de2abc4` (feat)
2. **Task 2: Wire user_id + Supabase persistence into router and service (AUTH-03, AUTH-04)** - `639fc18` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/api/app/graph/repository.py` - Added user_id parameter (default "anonymous") to persist_graph(); Cypher CREATE now includes created_by: $user_id and created_at: datetime()
- `apps/api/app/generate/service.py` - Added user_id + supabase params to run_generate_pipeline(); added _auto_title(); Supabase graphs table insert for authenticated users
- `apps/api/app/generate/router.py` - Added Request + supabase dependency injection; extracts user_id from JWT sub claim; fire-and-forget request_log insert after every generate call

## Decisions Made
- user_id default "anonymous" — persist_graph and run_generate_pipeline work for both authenticated and trial users without branching; anonymous trial graphs skip Supabase row
- Fire-and-forget pattern established: all Supabase writes in try/except pass blocks placed after the main response is constructed — Supabase failure never blocks Neo4j response
- Auto-title strategy: URL inputs produce "domain.com · Feb 27" using urlparse + strftime; text inputs produce first 60 chars + ellipsis if longer
- processing_ms in request_log differs slightly from meta.processing_ms (router measures full handler time including Supabase graph insert; service measures pipeline only) — acceptable for billing/debugging
- graphs row only inserted when user_id != "anonymous" — anonymous trial graph metadata not persisted to Supabase

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `python` command not available in shell (macOS); used `.venv/bin/python` from the api directory to run verification. Import and assertion tests passed.

## User Setup Required
None - no external service configuration required. Supabase tables (graphs, request_log) were created in Plan 02.

## Next Phase Readiness
- Graph ownership fields in Neo4j and Supabase are ready for Phase 4 graph history retrieval
- request_log provides full audit trail for usage analytics and billing
- All three persistence requirements (AI-05, AUTH-03, AUTH-04) complete

## Self-Check: PASSED

- FOUND: apps/api/app/graph/repository.py
- FOUND: apps/api/app/generate/service.py
- FOUND: apps/api/app/generate/router.py
- FOUND: .planning/phases/03-auth-persistence/03-04-SUMMARY.md
- FOUND: de2abc4 (Task 1 commit)
- FOUND: 639fc18 (Task 2 commit)

---
*Phase: 03-auth-persistence*
*Completed: 2026-02-27*
