---
phase: 01-backend-foundation
verified: 2026-02-27T12:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 9/10
  gaps_closed:
    - "All 29 tests now pass — 3 previously failing tests fixed by adding mock_response.headers = {'Content-Type': 'text/html; charset=utf-8'} to stale MagicMock objects in test_scraper.py and test_generate.py"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run docker-compose up and hit POST /api/generate with a real Clerk JWT and funding announcement text"
    expected: "200 response with graph.nodes (Investor, Project, Round, Narrative, Person types) and graph.edges with typed relationships; Neo4j browser at http://localhost:7474 shows persisted Entity nodes with session_id property"
    why_human: "Requires live Docker environment, real OpenAI API key, real Neo4j, and a valid Clerk JWT"
  - test: "curl -X POST http://localhost:8000/api/generate -H 'Content-Type: application/json' -d '{\"input\": \"https://127.0.0.1/secret\"}' with a valid Bearer token"
    expected: "400 response with detail.error = 'invalid_url' and detail.message = 'URL resolves to a blocked address'"
    why_human: "Requires live server to verify full request path with real DNS resolution"
  - test: "Check Render environment variables for the apps/api service — confirm DEV_SKIP_AUTH is absent or false"
    expected: "No DEV_SKIP_AUTH=true present in production environment"
    why_human: "Production environment variables cannot be verified from the codebase"
---

# Phase 1: Backend Foundation Verification Report

**Phase Goal:** Deploy production backend (FastAPI on Render) with OpenAI-powered entity extraction, URL scraping, Supabase auth integration, and security hardening. Frontend (Next.js on Vercel) connects via authenticated API proxy.
**Verified:** 2026-02-27
**Status:** passed
**Re-verification:** Yes — gap closure confirmed after 2026-02-27 regression fix

## Summary

This is the third verification of Phase 1. The initial verification (2026-02-25) passed 5/5 truths with 29/29 tests green. A second verification on 2026-02-27 discovered 3 test regressions caused by a post-plan content-type guard added to `scraper.py` without updating test mocks. Those mocks have now been fixed: all three failing tests (`test_returns_extracted_text`, `test_uses_allow_redirects_false`, `test_generate_url_input_scrapes_and_extracts`) received `mock_response.headers = {"Content-Type": "text/html; charset=utf-8"}` and now pass. The full suite is 29/29 green.

All 10 Phase 1 requirements (INFRA-01, INFRA-02, SEC-01, SEC-02, SEC-03, SEC-04, AI-01, AI-02 scraping/extraction, AI-03, AI-04) remain SATISFIED. Phase goal is achieved.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Developer can run `docker-compose up` and hit `POST /api/generate` with funding announcement text, receiving structured JSON graph | VERIFIED | `docker-compose.yml` defines neo4j:5.20-community + redis:7-alpine + api with `service_healthy` deps; `docker compose config` exits 0; router registered via `app.include_router(generate_router)` |
| 2 | Backend rejects a URL pointing to `127.0.0.1` or `10.0.0.1` with a 400 error (SSRF protection) | VERIFIED | `ssrf.py` BLOCKED_NETWORKS covers `127.0.0.0/8` and `10.0.0.0/8`; `validate_url()` is first call in `scrape_url()`; 9 SSRF test cases all PASSED |
| 3 | All Neo4j queries use parameterised Cypher ($param syntax) — zero string interpolation | VERIFIED | `repository.py` uses `$nodes`, `$edges`, `$session_id`, `$user_id` throughout; grep for `.format(` and f-strings in `app/graph/` returns zero matches |
| 4 | A request with an invalid or expired Clerk JWT is rejected with 401 before any business logic executes | VERIFIED | `router.py` declares `current_user: dict = Depends(get_current_user)` first; `get_current_user` raises `HTTPException(401)` for missing, expired, invalid-signature, and invalid-azp tokens; `test_generate_rejects_missing_auth` PASSED |
| 5 | Backend rejects text inputs shorter than 200 characters with a 400 and the exact message from AI-04 | VERIFIED | `validate_input_length()` raises `HTTPException(400)` with exact message; applied to text-path inputs in `service.py`; `test_exact_error_message` and `test_generate_rejects_short_input` PASSED |
| 6 | URL scraping strips boilerplate HTML via BeautifulSoup and caps content at 32,000 characters | VERIFIED | `scraper.py` strips script/style/nav/footer/header/aside; `MAX_CONTENT_CHARS = 32_000`; `_extract_text()` tests all PASSED (5/5 TestExtractText) |
| 7 | FastAPI uses a single Neo4j driver singleton created at startup (not per-request) | VERIFIED | `main.py` uses `asynccontextmanager` lifespan; `app.state.neo4j_driver` created once; `get_neo4j_driver()` reads from `app.state`; `.close()` called on shutdown |
| 8 | GPT-4o structured extraction covers all 5 entity types and 8 relationship types | VERIFIED | `prompts.py` covers Investor/Project/Round/Narrative/Person and LED/INVESTED_IN/CO_INVESTED/RAISED/FOUNDED/PARTNERS_AT/FOCUSES_ON/CLASSIFIED_AS; `schemas.py` enforces all via `Literal` types; `client.beta.chat.completions.parse()` with `VCKnowledgeGraph` response_format used |
| 9 | Frontend shows live character counter and blocks submission for text < 200 chars (Plan 06 gap closure) | VERIFIED | `InputCard.tsx` has `MIN_TEXT_LENGTH = 200` and `textTooShort` disables submit; `HeroSection.tsx` has same constant with URL-bypass logic; `api.ts` maps "HTTP 503" to "warming up" message |
| 10 | All automated tests pass green (29/29) | VERIFIED | `uv run pytest tests/ -v` ran on 2026-02-27 — 29 passed, 0 failed, 4 deprecation warnings (Supabase client timeout/verify params, not errors); all 3 previously failing tests now pass |

**Score:** 10/10 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/pyproject.toml` | uv-managed dependency manifest | VERIFIED | Contains `fastapi[standard]>=0.115`, `neo4j==5.28.3` (pinned), `openai>=1.40,<2`, `pyjwt>=2.11.0`, `beautifulsoup4`, `lxml`, `requests`, `pydantic-settings`, `supabase`, `sentry-sdk` |
| `apps/api/app/main.py` | FastAPI app with lifespan context manager | VERIFIED | Uses `asynccontextmanager` lifespan; creates `app.state.neo4j_driver` at startup; calls `.close()` on shutdown; includes `generate_router`; Supabase singleton wired |
| `apps/api/app/config.py` | Pydantic BaseSettings for env var loading | VERIFIED | Uses `pydantic_settings.BaseSettings`; all required fields present; `dev_skip_auth` flag for local dev |
| `docker-compose.yml` | Neo4j + Redis + api service definitions | VERIFIED | `neo4j:5.20-community` with cypher-shell healthcheck; `redis:7-alpine` with redis-cli ping healthcheck; api `depends_on` both with `service_healthy` condition |
| `apps/api/app/scraper/ssrf.py` | SSRF URL validator | VERIFIED | `BLOCKED_NETWORKS` covers RFC 1918, loopback, link-local, IPv6; `validate_url()` and `validate_input_length()` both implemented substantively |
| `apps/api/app/scraper/scraper.py` | SSRF-aware URL scraper with BeautifulSoup | VERIFIED | Contains `allow_redirects=False`; calls `validate_url()` first; handles redirects with SSRF re-validation; strips script/nav/footer; caps at 32,000 chars; content-type guard correctly rejects non-HTML responses |
| `apps/api/app/graph/repository.py` | Neo4j CRUD with parameterized Cypher | VERIFIED | Contains `UNWIND $nodes`; all queries use `$param` syntax; zero string interpolation; `persist_graph()` and `get_graph_by_session()` both implemented; `created_by: $user_id` for AI-05 ownership |
| `apps/api/app/auth/clerk.py` | Clerk JWT verification via PyJWT + PyJWKClient | VERIFIED | Contains `PyJWKClient`; RS256 verification; azp claim validation; `HTTPBearer(auto_error=False)`; dev bypass via `dev_skip_auth` flag |
| `apps/api/app/dependencies.py` | get_neo4j_driver + get_current_user re-export | VERIFIED | Contains `get_current_user` re-exported from `app.auth.clerk`; `get_neo4j_driver` reads from `request.app.state.neo4j_driver`; `get_supabase_client` added for Phase 3 |
| `apps/api/app/generate/schemas.py` | Pydantic models: VCKnowledgeGraph, GraphNode, GraphEdge, GenerateRequest, GenerateResponse | VERIFIED | Contains `VCKnowledgeGraph`; all 5 EntityType literals; all 8 RelationshipType literals; `NodeProperties` model with `extra="forbid"` for OpenAI structured outputs compatibility |
| `apps/api/app/generate/prompts.py` | GPT-4o system prompt constant | VERIFIED | Contains `SYSTEM_PROMPT`; covers all 5 entity types with property descriptions; covers all 8 relationship types; deduplication rules present |
| `apps/api/app/generate/service.py` | run_generate_pipeline() calling OpenAI native structured outputs | VERIFIED | Contains `client.beta.chat.completions.parse`; source type detection (URL vs text); `validate_input_length()` called for text path only (URL path has its own content yield check in scraper); `persist_graph()` called after extraction |
| `apps/api/app/generate/router.py` | POST /api/generate endpoint | VERIFIED | Contains `router.post`; `Depends(get_current_user)` wired; `Depends(get_neo4j_driver)` wired; `Depends(get_supabase_client)` for AUTH-04 logging |
| `apps/api/tests/test_ssrf.py` | Pytest tests for SSRF validation | VERIFIED | Contains `test_rejects_private_ip`; 16 tests covering URL blocking and input length; all 16 PASSED |
| `apps/api/tests/test_scraper.py` | Pytest tests for BeautifulSoup extraction | VERIFIED | All 9 tests PASS (5 TestExtractText + 4 TestScrapeUrl); previously failing `test_returns_extracted_text` and `test_uses_allow_redirects_false` now pass after adding `mock_response.headers = {"Content-Type": "text/html; charset=utf-8"}` to both test mocks |
| `apps/api/tests/test_generate.py` | Integration tests for generate endpoint | VERIFIED | All 4 tests PASS; previously failing `test_generate_url_input_scrapes_and_extracts` now passes after adding `mock_response.headers = {"Content-Type": "text/html; charset=utf-8"}` to the scraper mock |
| `apps/web/components/input/InputCard.tsx` | Client-side 200-char min validation (Plan 06) | VERIFIED | `MIN_TEXT_LENGTH = 200`; `textTooShort` computed; submit button disabled; character counter rendered |
| `apps/web/components/landing/HeroSection.tsx` | Client-side 200-char min validation (Plan 06) | VERIFIED | `MIN_TEXT_LENGTH = 200`; URL-bypass logic present; character counter rendered; 503 message wired |
| `apps/web/lib/api.ts` | Friendly 503 error message (Plan 06) | VERIFIED | `response.status === 503 && detail.message === 'HTTP 503'` check; "warming up" message set |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/main.py` | `app.state.neo4j_driver` | `lifespan asynccontextmanager` | WIRED | `app.state.neo4j_driver = GraphDatabase.driver(...)` in lifespan; `.close()` on shutdown |
| `app/dependencies.py` | `app.state.neo4j_driver` | `request.app.state` | WIRED | `return request.app.state.neo4j_driver` confirmed |
| `docker-compose.yml` | `apps/api` | `depends_on neo4j service_healthy` | WIRED | `condition: service_healthy` for both neo4j and redis |
| `app/scraper/scraper.py` | `app/scraper/ssrf.py` | `validate_url()` called before requests.get() | WIRED | `validate_url(url)` is first line of `scrape_url()`; redirect targets also validated |
| `app/graph/repository.py` | neo4j driver | `driver injected from app.state` | WIRED | `persist_graph(driver, ...)` signature; driver passed from `router.py` via `Depends(get_neo4j_driver)` |
| `app/generate/router.py` | `app/dependencies.py` | `Depends(get_current_user) + Depends(get_neo4j_driver)` | WIRED | Both dependencies declared on `generate()` handler; auth dependency listed first |
| `app/generate/service.py` | openai client | `client.beta.chat.completions.parse()` | WIRED | `response = client.beta.chat.completions.parse(model="gpt-4o", response_format=VCKnowledgeGraph, ...)` |
| `app/generate/service.py` | `app/graph/repository.py` | `persist_graph()` called after extract_graph() | WIRED | `persist_graph(driver, session_id=session_id, nodes=nodes, edges=edges, user_id=user_id)` |
| `app/generate/service.py` | `app/scraper/scraper.py` | `scrape_url()` called when input starts with https:// | WIRED | `content = scrape_url(raw_input.strip())` on URL path |
| `app/dependencies.py` | `app/auth/clerk.py` | `from app.auth.clerk import get_current_user` | WIRED | Re-export confirmed; `# noqa: F401` present |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-01 | 01-01 | Developer can scaffold monorepo with apps/api/ (FastAPI) | SATISFIED | `apps/api/` fully scaffolded with uv; `pyproject.toml`, `.python-version`, `app/` directory structure with subdomain packages |
| INFRA-02 | 01-01 | Developer can run full stack with `docker-compose up` starting Neo4j and Redis | SATISFIED | `docker-compose.yml` at repo root; neo4j:5.20-community + redis:7-alpine + api service; healthchecks and `service_healthy` conditions |
| SEC-01 | 01-02, 01-03 | Backend validates every inbound URL against private IP ranges, enforces HTTPS-only, rejects blocked domains | SATISFIED | `ssrf.py` BLOCKED_NETWORKS covers RFC 1918, loopback, link-local, IPv6 ULA, RFC 6598; `validate_url()` checks scheme first, resolves hostname, checks all blocked ranges + catch-all `is_global` check; `allow_redirects=False` with redirect re-validation in scraper; all 9 SSRF URL tests PASSED |
| SEC-02 | 01-03 | All Neo4j queries use parameterised Cypher — zero string interpolation | SATISFIED | `repository.py` grep confirms zero `.format(` or f-strings; all queries use `$nodes`, `$edges`, `$session_id`, `$user_id`; all neo4j-importing files clean |
| SEC-03 | 01-04 | Every FastAPI protected endpoint validates the Clerk JWT Bearer token | SATISFIED | `get_current_user` dependency: RS256 via PyJWKClient, expiry verification, azp claim validation; wired via `Depends(get_current_user)` on `POST /api/generate`; missing token → 401 (not 422) via `HTTPBearer(auto_error=False)`; `test_generate_rejects_missing_auth` PASSED. NOTE: `dev_skip_auth` flag bypasses JWT in development — documented dev-only escape hatch, not a production security risk |
| SEC-04 | 01-01 | FastAPI initialises a single Neo4j driver instance at startup (singleton) | SATISFIED | `app.state.neo4j_driver` created once in `lifespan` asynccontextmanager; `get_neo4j_driver()` reads from `app.state`; `.close()` called on shutdown |
| AI-01 | 01-05 | Backend generates structured knowledge graph from GPT-4o with VC-specific system prompt | SATISFIED | `prompts.py` covers all 5 entity types and 8 relationship types; `service.py` uses `client.beta.chat.completions.parse()` with `VCKnowledgeGraph` as `response_format`; `NodeProperties` uses `extra="forbid"` for OpenAI structured outputs compatibility |
| AI-02 (scraping/extraction) | 01-03 | Backend scrapes a public HTTPS URL, strips boilerplate HTML via BeautifulSoup, caps at 32,000 chars | SATISFIED | `scraper.py` uses BeautifulSoup lxml; strips script/style/nav/footer/header/aside; extracts h1/h2/h3, article, p; `MAX_CONTENT_CHARS = 32_000`; content-type guard added for robustness; Redis caching sub-requirement correctly deferred to Phase 4 per plan scope note |
| AI-03 | 01-05 | User can paste raw text directly — bypasses scraping, goes straight to GPT-4o | SATISFIED | `service.py` source type detection: input starting with `https://` → scrape path; everything else → text path with `validate_input_length()` then direct GPT-4o; `test_generate_text_input_returns_graph` PASSED with `meta.source_type = "text"` |
| AI-04 | 01-02, 01-05 | Backend rejects inputs shorter than 200 characters with 400 and exact message | SATISFIED | `validate_input_length()` raises `HTTPException(400, detail={"error": "input_too_short", "message": "Input too short — paste a full funding announcement or article for best results"})`; applied to text inputs in `service.py`; exact message verified by `test_exact_error_message` PASSED. NOTE: URL inputs skip the 200-char check — the URL itself is short but scraped content has a 500-char minimum yield check in `scraper.py`. This is a correct implementation of the requirement's intent. |

**All 10 requirements for Phase 1 are SATISFIED.** No orphaned requirements found.

**Note on AI-02 scope:** The Redis caching sub-requirement ("caches raw scraped text in Redis for 1 hour") is intentionally deferred to Phase 4 alongside RATE-03. Correctly documented in REQUIREMENTS.md traceability and `scraper.py` inline comments.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/auth/clerk.py` | 19 | f-string: `f"https://{settings.clerk_frontend_api}/.well-known/jwks.json"` | Info | Not a Cypher query; constructs JWKS URL for PyJWKClient; acceptable use — `clerk.py` does not import neo4j so SEC-02 does not apply |
| `app/auth/clerk.py` | 50-51 | `dev_skip_auth` bypass returns mock user payload | Warning | Documented dev-only feature. If `DEV_SKIP_AUTH=true` were set in production, all auth would be bypassed. However: (1) it is gated on `settings.dev_skip_auth` which defaults to `False`, (2) `Dockerfile` does not set this env var, (3) comment says "never set in production". Human should verify Render deploy env vars do NOT include `DEV_SKIP_AUTH=true`. |

No blocker anti-patterns remain. The 3 previously blocker-severity stale mocks in `test_scraper.py` and `test_generate.py` have been resolved.

---

## Human Verification Required

### 1. End-to-End docker-compose Flow

**Test:** Run `docker-compose up`, wait for all services to reach healthy state, then:
```
curl -X POST http://localhost:8000/api/generate \
  -H "Authorization: Bearer $VALID_JWT" \
  -H "Content-Type: application/json" \
  -d '{"input": "Paradigm Capital led a $50M Series A round in Uniswap v4 with participation from a16z crypto and Coinbase Ventures. General Partner Matt Huang announced the deal on Thursday. The round values Uniswap Labs at approximately $1.66 billion and will be used to fund further development of the automated market maker protocol."}'
```
**Expected:** 200 response with `graph.nodes` containing Investor, Project, and Round types; `graph.edges` with typed relationships; `meta.source_type = "text"`
**Why human:** Requires live Docker environment, real OPENAI_API_KEY, real Neo4j, and a valid Clerk JWT

### 2. Live SSRF Rejection via curl

**Test:** With server running, `curl -X POST http://localhost:8000/api/generate -H "Authorization: Bearer $VALID_JWT" -H "Content-Type: application/json" -d '{"input": "https://127.0.0.1/secret"}'`
**Expected:** `{"detail": {"error": "invalid_url", "message": "URL resolves to a blocked address"}}` with HTTP 400
**Why human:** Verifies the full request path from HTTP to SSRF guard; unit tests mock socket.gethostbyname but this confirms live DNS resolution path

### 3. Verify DEV_SKIP_AUTH is NOT set on Render

**Test:** Check Render environment variables for the `apps/api` service — confirm `DEV_SKIP_AUTH` is absent or `false`
**Expected:** No `DEV_SKIP_AUTH=true` present in production environment
**Why human:** Production environment variables cannot be verified from the codebase

---

## Re-verification Summary

**Gap closed:** The single gap from the 2026-02-27 re-verification is resolved.

The 3 test regressions were caused by stale `MagicMock` response objects not simulating `Content-Type: text/html` after the content-type guard was added to `scraper.py` post-plan. The fix was applied to:
- `apps/api/tests/test_scraper.py` lines 46, 62, 77: `mock_response.headers = {"Content-Type": "text/html; charset=utf-8"}`
- `apps/api/tests/test_generate.py` line 147: same fix for the scraper mock in `test_generate_url_input_scrapes_and_extracts`

Full test run 2026-02-27: `29 passed, 0 failed, 4 warnings` (warnings are Supabase client deprecation notices, not errors).

**No regressions detected** in previously passing items. All key wiring verified unchanged: `validate_url()` still first in `scrape_url()`, `Depends(get_current_user)` still first on router, `persist_graph()` still called after extraction, driver singleton still managed by lifespan.

Phase 1 goal is fully achieved.

---

_Verified: 2026-02-27_
_Verifier: Claude (gsd-verifier)_
