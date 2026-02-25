---
phase: 01-backend-foundation
plan: 05
subsystem: api
tags: [fastapi, openai, gpt-4o, structured-outputs, pydantic, neo4j, clerk, jwt, ssrf, pytest, python]

# Dependency graph
requires:
  - phase: 01-backend-foundation/01-02
    provides: validate_url() SSRF guard, validate_input_length() AI-04 enforcement
  - phase: 01-backend-foundation/01-03
    provides: scrape_url() SSRF-aware scraper, persist_graph() parameterized Neo4j repo
  - phase: 01-backend-foundation/01-04
    provides: get_current_user FastAPI dependency (RS256 JWT validation via Clerk JWKS)
provides:
  - POST /api/generate endpoint — authenticated, validated, full pipeline
  - VCKnowledgeGraph Pydantic schema for OpenAI native structured outputs (AI-01)
  - GraphNode/GraphEdge with 5 EntityTypes and 8 RelationshipTypes
  - GenerateRequest/GenerateResponse API contract models matching CONTEXT.md
  - SYSTEM_PROMPT for GPT-4o VC entity extraction with deduplication rules
  - run_generate_pipeline() — source detection, scraping, GPT-4o call, Neo4j persistence
  - 4-test integration test suite covering text input, auth rejection, short input, URL input
affects:
  - Phase 2 (frontend — consumes POST /api/generate API contract)
  - Phase 3 (user history — uses session_id from generate response for graph retrieval)
  - Phase 4 (Redis caching — will wrap scrape_url() in generate/service.py with Redis cache)

# Tech tracking
tech-stack:
  added:
    - openai>=1.40,<2 (already in pyproject.toml from Plan 01 — now actually used)
  patterns:
    - OpenAI module-level singleton via _get_openai_client() lazy init (matches PyJWKClient pattern from Plan 04)
    - client.beta.chat.completions.parse() for native structured outputs — no JSON repair needed
    - Source type detection: raw_input.strip().startswith("https://") gate before scrape vs text path
    - validate_input_length() applied to text inputs only — URL inputs have scrape_url() 500-char yield check
    - Both OpenAI and Neo4j failures raise HTTPException(503) with service_unavailable error shape
    - TestClient lifespan mocking via patch("app.main.GraphDatabase.driver") to avoid real Neo4j in tests

key-files:
  created:
    - apps/api/app/generate/schemas.py
    - apps/api/app/generate/prompts.py
    - apps/api/app/generate/service.py
    - apps/api/app/generate/router.py
    - apps/api/tests/test_generate.py
  modified:
    - apps/api/app/main.py

key-decisions:
  - "validate_input_length() applied to text inputs only — URL inputs were being rejected by length check on the short URL string itself; URL content yield is validated by scrape_url() 500-char minimum"
  - "OpenAI client as module-level singleton (_openai_client global) — matches PyJWKClient lazy singleton pattern from Plan 04, one instance per worker process"
  - "client.beta.chat.completions.parse() with VCKnowledgeGraph response_format — native structured outputs guarantee schema, no JSON repair needed (AI-01)"
  - "patch('app.main.GraphDatabase.driver') in test fixture — prevents TestClient lifespan from attempting real Neo4j connection in CI (no Neo4j Docker in test environment)"

patterns-established:
  - "Service singleton: lazy _get_openai_client() global for OpenAI client (same pattern as PyJWKClient in auth)"
  - "503 error shape: HTTPException(503, {error: 'service_unavailable', message: '...'}) for both OpenAI and Neo4j failures"
  - "Source type gate: raw_input.strip().startswith('https://') determines url vs text path in service"
  - "Lifespan mock pattern: patch 'app.main.GraphDatabase.driver' for integration tests without live Neo4j"

requirements-completed: [AI-01, AI-03, AI-04]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 1 Plan 05: POST /api/generate Endpoint Summary

**GPT-4o structured entity extraction endpoint with Clerk JWT auth guard, SSRF-aware URL scraping, and parameterized Neo4j persistence — completing the Phase 1 core pipeline**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T14:00:13Z
- **Completed:** 2026-02-25T14:03:39Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `POST /api/generate` endpoint wires together all Phase 1 components: Clerk JWT auth (Plan 04), SSRF scraper (Plans 02/03), Neo4j persistence (Plan 03), and GPT-4o structured outputs (AI-01)
- `VCKnowledgeGraph` Pydantic schema with 5 EntityTypes and 8 RelationshipTypes used as `response_format` for `client.beta.chat.completions.parse()` — native structured outputs guarantee schema compliance
- Full integration test suite (4 tests) passing in 0.59s with mocked Neo4j lifespan and mocked OpenAI client
- All 29 tests across test_generate.py, test_scraper.py, and test_ssrf.py pass (0 failures)

## Task Commits

Each task was committed atomically:

1. **Task 1: Pydantic schemas, GPT-4o system prompt, and extraction service** - `5f72e10` (feat)
2. **Task 2: POST /api/generate router, app registration, and integration tests** - `50d86b5` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `apps/api/app/generate/schemas.py` - VCKnowledgeGraph, GraphNode, GraphEdge, GenerateRequest, GenerateResponse, GenerateMeta Pydantic models
- `apps/api/app/generate/prompts.py` - SYSTEM_PROMPT with 5 entity types, 8 relationship types, deduplication rules for GPT-4o
- `apps/api/app/generate/service.py` - run_generate_pipeline(): source detection -> optional scrape -> GPT-4o parse -> Neo4j persist -> response dict
- `apps/api/app/generate/router.py` - POST /api/generate with Depends(get_current_user) + Depends(get_neo4j_driver)
- `apps/api/app/main.py` - Modified: added `app.include_router(generate_router)` import and registration
- `apps/api/tests/test_generate.py` - 4 integration tests: text input returns graph, missing auth 401, short input 400, URL input source_type=url

## Decisions Made

- **validate_input_length() for text inputs only:** The plan spec placed `validate_input_length()` before source type detection, which caused URL inputs to be rejected (short URLs like `https://techcrunch.com/article` are < 200 chars). Fixed: length validation applies to text inputs only. URL inputs rely on `scrape_url()`'s 500-char minimum yield check for content quality validation.
- **OpenAI client as module-level singleton:** `_get_openai_client()` lazy global matches the `_get_jwks_client()` pattern from Plan 04 (PyJWKClient). One client instance per worker process.
- **patch('app.main.GraphDatabase.driver') for tests:** The FastAPI lifespan calls `GraphDatabase.driver()` and `verify_connectivity()` at TestClient startup. Without patching, every test fails with `ConnectionRefusedError` (no Neo4j running in test env). Patching at the `app.main` module level prevents the real connection attempt while keeping the mock driver in `app.state`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed validate_input_length() placement for URL inputs**
- **Found during:** Task 2 (integration tests)
- **Issue:** Plan spec called `validate_input_length(raw_input)` before source type detection. URL inputs (`"https://techcrunch.com/article"` = 33 chars) were rejected with 400 input_too_short before reaching the scraper. The test `test_generate_url_input_scrapes_and_extracts` failed with 400 instead of 200.
- **Fix:** Moved `validate_input_length()` inside the `else` (text input) branch. URL inputs bypass the text length check because `scrape_url()` already enforces a 500-char minimum content yield check.
- **Files modified:** `apps/api/app/generate/service.py`
- **Verification:** All 4 integration tests pass; text input short-circuit still returns 400 with exact AI-04 message.
- **Committed in:** `50d86b5` (Task 2 commit)

**2. [Rule 3 - Blocking] Added GraphDatabase.driver lifespan mock to test fixture**
- **Found during:** Task 2 (integration tests — all 4 tests failing with ConnectionRefusedError)
- **Issue:** Plan spec's `app_with_mocks` fixture set `app.state.neo4j_driver = mock_neo4j_driver` but `TestClient(app).__enter__` triggers the lifespan which calls `GraphDatabase.driver()` and `verify_connectivity()` before the state assignment. Without Neo4j running locally, all tests fail.
- **Fix:** Added `with patch("app.main.GraphDatabase.driver", return_value=mock_neo4j_driver):` context manager wrapping `yield app` in the fixture.
- **Files modified:** `apps/api/tests/test_generate.py`
- **Verification:** All 4 tests pass (0.59s), lifespan completes without real Neo4j connection.
- **Committed in:** `50d86b5` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes required for tests to pass. No scope creep. Planned files all created as specified.

## Issues Encountered

Both issues were auto-fixed inline without blocking task progress. See Deviations above.

## User Setup Required

Before running the API, the following environment variables must be set in `apps/api/.env`:

| Variable | Source |
|---|---|
| `OPENAI_API_KEY` | OpenAI Platform -> API Keys -> Create new secret key |

This plan is the first to actually use the `OPENAI_API_KEY` (declared in config.py in Plan 01). All other env vars (`NEO4J_*`, `CLERK_*`) were set up in Plans 01 and 04.

## Next Phase Readiness

- `POST /api/generate` is the Phase 1 success criterion endpoint — fully implemented and tested
- Phase 2 frontend can consume `{"input": "..."}` -> `{graph: {nodes, edges}, meta: {session_id, ...}}`
- Phase 3 history retrieval can use `session_id` from meta to fetch graphs via `get_graph_by_session()`
- Phase 4 Redis caching: `generate/service.py` is the correct place to add cache check before `scrape_url()`
- Phase 1 is now complete — all 5 plans delivered

---
*Phase: 01-backend-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED

All files confirmed present on disk and all commits confirmed in git history.

- FOUND: apps/api/app/generate/schemas.py
- FOUND: apps/api/app/generate/prompts.py
- FOUND: apps/api/app/generate/service.py
- FOUND: apps/api/app/generate/router.py
- FOUND: apps/api/tests/test_generate.py
- FOUND: .planning/phases/01-backend-foundation/01-05-SUMMARY.md
- FOUND: commit 5f72e10 (Task 1)
- FOUND: commit 50d86b5 (Task 2)
