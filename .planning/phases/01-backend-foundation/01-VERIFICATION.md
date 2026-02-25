---
phase: 01-backend-foundation
verified: 2026-02-25T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Run docker-compose up and hit POST /api/generate with a real Clerk JWT and funding announcement text"
    expected: "200 response with graph.nodes (Investor, Project, Round, Narrative, Person types) and graph.edges with typed relationships; Neo4j browser at http://localhost:7474 shows persisted Entity nodes with session_id property"
    why_human: "Requires live Docker environment, real OpenAI API key, real Neo4j, and a valid Clerk JWT — cannot mock end-to-end"
  - test: "curl -X POST http://localhost:8000/api/generate -H 'Content-Type: application/json' -d '{\"input\": \"https://127.0.0.1/secret\"}' with a valid Bearer token"
    expected: "400 response with detail.error = 'invalid_url' and detail.message = 'URL resolves to a blocked address'"
    why_human: "Requires live server — unit tests mock socket.gethostbyname so this verifies the full request path"
---

# Phase 1: Backend Foundation Verification Report

**Phase Goal:** A working FastAPI service that accepts text or URL input, scrapes safely, extracts crypto VC entities via GPT-4o, persists graphs to Neo4j, and is free of the SSRF, Cypher injection, and JWT vulnerabilities inherited from the Flask codebase
**Verified:** 2026-02-25
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Developer can run `docker-compose up` and hit `POST /api/generate` with funding announcement text, receiving structured JSON graph with all 5 entity types and typed relationships | VERIFIED | `docker-compose.yml` defines neo4j:5.20-community + redis:7-alpine + api with `service_healthy` deps; `POST /api/generate` endpoint wired in `router.py` with `run_generate_pipeline()` calling GPT-4o with `VCKnowledgeGraph` schema (Investor, Project, Round, Narrative, Person); `test_generate_text_input_returns_graph` PASSED |
| 2 | Backend rejects a URL pointing to `127.0.0.1` or `10.0.0.1` with a 400 error — SSRF protection verifiable via curl | VERIFIED | `ssrf.py` BLOCKED_NETWORKS covers `127.0.0.0/8` and `10.0.0.0/8`; `validate_url()` is first call in `scrape_url()`; `service.py` routes URL inputs through `scrape_url()`; 9 test cases cover loopback, all RFC 1918 ranges, and AWS metadata endpoint — all PASSED |
| 3 | All Neo4j queries use parameterised Cypher (`$param` syntax) — zero string interpolation; code search for `.format(` and f-strings in files importing neo4j returns no results | VERIFIED | `repository.py` uses `$nodes`, `$edges`, `$session_id` throughout; grep of all neo4j-importing files (`repository.py`, `main.py`, `dependencies.py`, `router.py`) returns zero matches for `.format(` or f-strings; only f-string in codebase is `clerk.py` line 19 (JWKS URL construction — not a Cypher query, not a neo4j-importing file) |
| 4 | A request with an invalid or expired Clerk JWT is rejected with 401 before any business logic executes | VERIFIED | `router.py` declares `current_user: dict = Depends(get_current_user)` as first dependency parameter; `get_current_user` raises `HTTPException(401)` for missing, expired, invalid-signature, and invalid-azp tokens before `run_generate_pipeline()` is called; `test_generate_rejects_missing_auth` PASSED |
| 5 | Backend rejects inputs shorter than 200 characters with a 400 and the exact message "Input too short — paste a full funding announcement or article for best results" | VERIFIED | `ssrf.py` `validate_input_length()` raises `HTTPException(400)` with `detail.error = "input_too_short"` and exact message; `service.py` calls `validate_input_length(raw_input)` for text inputs; `test_exact_error_message` and `test_generate_rejects_short_input` PASSED with exact message match |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/pyproject.toml` | uv-managed dependency manifest | VERIFIED | Contains `fastapi[standard]>=0.115`, `neo4j==5.28.3` (pinned), `openai>=1.40,<2`, `pyjwt>=2.11.0`, `beautifulsoup4`, `lxml`, `requests`, `cryptography`, `pydantic-settings` |
| `apps/api/app/main.py` | FastAPI app with lifespan context manager | VERIFIED | Uses `@asynccontextmanager` lifespan; creates `app.state.neo4j_driver` at startup; calls `.close()` on shutdown; no deprecated `@app.on_event`; includes `generate_router` |
| `apps/api/app/config.py` | Pydantic BaseSettings for env var loading | VERIFIED | Uses `pydantic_settings.BaseSettings`; all required fields present (`openai_api_key`, `neo4j_*`, `clerk_*`) |
| `docker-compose.yml` | Neo4j + Redis + api service definitions | VERIFIED | `neo4j:5.20-community` with cypher-shell healthcheck; `redis:7-alpine` with redis-cli ping healthcheck; api `depends_on` both with `service_healthy` condition |
| `apps/api/app/scraper/ssrf.py` | SSRF URL validator | VERIFIED | `BLOCKED_NETWORKS` covers RFC 1918, loopback, link-local, IPv6; `validate_url()` and `validate_input_length()` both implemented substantively |
| `apps/api/app/scraper/scraper.py` | SSRF-aware URL scraper with BeautifulSoup | VERIFIED | Contains `allow_redirects=False`; calls `validate_url()` first; handles redirects manually with SSRF re-validation; strips script/nav/footer; caps at 32,000 chars |
| `apps/api/app/graph/repository.py` | Neo4j CRUD with parameterized Cypher | VERIFIED | Contains `UNWIND $nodes`; all queries use `$param` syntax; zero string interpolation; `persist_graph()` and `get_graph_by_session()` both implemented |
| `apps/api/app/auth/clerk.py` | Clerk JWT verification via PyJWT + PyJWKClient | VERIFIED | Contains `PyJWKClient`; RS256 verification; azp claim validation; all failure paths return 401 with `{"error": "unauthorized", "message": "..."}` shape |
| `apps/api/app/dependencies.py` | get_neo4j_driver + get_current_user re-export | VERIFIED | Contains `get_current_user` re-exported from `app.auth.clerk`; `get_neo4j_driver` reads from `request.app.state.neo4j_driver` (singleton pattern) |
| `apps/api/app/generate/schemas.py` | Pydantic models: VCKnowledgeGraph, GraphNode, GraphEdge, GenerateRequest, GenerateResponse | VERIFIED | Contains `VCKnowledgeGraph`; all 5 EntityType literals; all 8 RelationshipType literals; `GenerateRequest`, `GenerateMeta`, `GenerateResponse` models present |
| `apps/api/app/generate/prompts.py` | GPT-4o system prompt constant | VERIFIED | Contains `SYSTEM_PROMPT`; covers all 5 entity types with property descriptions; covers all 8 relationship types; deduplication rules present |
| `apps/api/app/generate/service.py` | extract_graph() calling OpenAI native structured outputs | VERIFIED | Contains `client.beta.chat.completions.parse`; source type detection (URL vs text); `validate_input_length()` called for text path; `persist_graph()` called after extraction |
| `apps/api/app/generate/router.py` | POST /api/generate endpoint | VERIFIED | Contains `router.post`; `Depends(get_current_user)` wired; `Depends(get_neo4j_driver)` wired |
| `apps/api/tests/test_ssrf.py` | Pytest tests for SSRF validation | VERIFIED | Contains `test_rejects_private_ip`; 11 URL tests + 5 input length tests; all 16 PASSED |
| `apps/api/tests/test_scraper.py` | Pytest tests for BeautifulSoup extraction | VERIFIED | Contains `test_extracts_article_text`; 9 tests covering extraction and redirect handling; all PASSED |
| `apps/api/tests/test_generate.py` | Integration tests for generate endpoint | VERIFIED | Contains `test_generate_text_input_returns_graph`; 4 tests covering auth rejection, short input, text path, URL path; all PASSED |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/main.py` | `app.state.neo4j_driver` | `lifespan asynccontextmanager` | WIRED | `app.state.neo4j_driver = GraphDatabase.driver(...)` in lifespan; `.close()` on shutdown |
| `app/dependencies.py` | `app.state.neo4j_driver` | `request.app.state` | WIRED | `return request.app.state.neo4j_driver` confirmed |
| `docker-compose.yml` | `apps/api` | `depends_on neo4j service_healthy` | WIRED | `condition: service_healthy` for both neo4j and redis; `docker compose config` exits 0 |
| `app/scraper/scraper.py` | `app/scraper/ssrf.py` | `validate_url()` called before requests.get() | WIRED | `validate_url(url)` is first line of `scrape_url()`; redirect targets also validated |
| `app/graph/repository.py` | neo4j driver | `driver injected from app.state` | WIRED | `persist_graph(driver, ...)` signature; driver passed from `service.py` → `run_generate_pipeline(driver=driver)` |
| `app/generate/router.py` | `app/dependencies.py` | `Depends(get_current_user) + Depends(get_neo4j_driver)` | WIRED | Both dependencies declared on `generate()` handler; auth dependency listed first |
| `app/generate/service.py` | openai client | `client.beta.chat.completions.parse()` | WIRED | `response = client.beta.chat.completions.parse(model="gpt-4o", response_format=VCKnowledgeGraph, ...)` |
| `app/generate/service.py` | `app/graph/repository.py` | `persist_graph()` called after extract_graph() | WIRED | `persist_graph(driver, session_id=session_id, nodes=nodes, edges=edges)` on line 91 |
| `app/generate/router.py` | `app/scraper/scraper.py` | `scrape_url()` called when input starts with https:// | WIRED | `service.py` routes URL inputs to `scrape_url(raw_input.strip())`; imported at top of service.py |
| `app/dependencies.py` | `app/auth/clerk.py` | `from app.auth.clerk import get_current_user` | WIRED | Re-export confirmed; `# noqa: F401` present |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-01 | 01-01 | Developer can scaffold monorepo with apps/api/ (FastAPI) | SATISFIED | `apps/api/` fully scaffolded with uv; `pyproject.toml`, `.python-version`, `app/` directory structure with subdomain packages |
| INFRA-02 | 01-01 | Developer can run full stack with `docker-compose up` starting Neo4j and Redis | SATISFIED | `docker-compose.yml` at repo root; neo4j:5.20-community + redis:7-alpine + api service; healthchecks configured; `docker compose config` validates |
| SEC-01 | 01-02, 01-03 | Backend validates every inbound URL against private IP ranges, enforces HTTPS-only, rejects blocked domains | SATISFIED | `ssrf.py` BLOCKED_NETWORKS covers RFC 1918, loopback, link-local, IPv6 ULA, RFC 6598; `validate_url()` checks scheme first, resolves hostname, checks all blocked ranges + catch-all `is_global` check; `allow_redirects=False` with redirect re-validation in scraper |
| SEC-02 | 01-03 | All Neo4j queries use parameterised Cypher — zero string interpolation | SATISFIED | `repository.py` grep confirms zero `.format(` or f-strings; all queries use `$nodes`, `$edges`, `$session_id`; all neo4j-importing files clean |
| SEC-03 | 01-04 | Every FastAPI protected endpoint validates the Clerk JWT Bearer token | SATISFIED | `get_current_user` dependency: RS256 via PyJWKClient, expiry verification, azp claim validation; wired via `Depends(get_current_user)` on `POST /api/generate`; missing token → 401 (not 422) via `HTTPBearer(auto_error=False)` |
| SEC-04 | 01-01 | FastAPI initialises a single Neo4j driver instance at startup (singleton) | SATISFIED | `app.state.neo4j_driver` created once in `lifespan` asynccontextmanager; `get_neo4j_driver()` reads from `app.state`; `.close()` called on shutdown |
| AI-01 | 01-05 | Backend generates structured knowledge graph from GPT-4o with VC-specific system prompt | SATISFIED | `prompts.py` covers all 5 entity types and 8 relationship types; `service.py` uses `client.beta.chat.completions.parse()` with `VCKnowledgeGraph` as `response_format`; schemas enforce entity/relationship type literals |
| AI-02 (scraping/extraction) | 01-03 | Backend scrapes a public HTTPS URL, strips boilerplate HTML via BeautifulSoup, caps content at 32,000 chars | SATISFIED | `scraper.py` uses BeautifulSoup lxml; strips script/style/nav/footer/header/aside; extracts h1/h2/h3, article, p; `MAX_CONTENT_CHARS = 32_000`; Redis caching sub-requirement explicitly deferred to Phase 4 per plan note and REQUIREMENTS.md traceability |
| AI-03 | 01-05 | User can paste raw text directly — bypasses scraping, goes straight to GPT-4o | SATISFIED | `service.py` source type detection: input starting with `https://` → scrape path; everything else → text path with `validate_input_length()` then direct GPT-4o; `test_generate_url_input_scrapes_and_extracts` and `test_generate_text_input_returns_graph` both verify branching |
| AI-04 | 01-02, 01-05 | Backend rejects inputs shorter than 200 characters with 400 and exact message | SATISFIED | `validate_input_length()` raises `HTTPException(400, detail={"error": "input_too_short", "message": "Input too short — paste a full funding announcement or article for best results"})`; applied to text inputs in `service.py`; exact message verified by `test_exact_error_message` |

**Note on AI-02 scope:** The Redis caching sub-requirement ("caches raw scraped text in Redis for 1 hour") is intentionally deferred to Phase 4 alongside RATE-03. This is correctly documented in REQUIREMENTS.md traceability, the 01-03-PLAN.md scope note, and `scraper.py` inline comments. This partial delivery does not block the Phase 1 goal.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/auth/clerk.py` | 19 | f-string: `f"https://{settings.clerk_frontend_api}/.well-known/jwks.json"` | Info | Not a Cypher query; constructs JWKS URL for PyJWKClient; acceptable use of f-string for URL construction; `clerk.py` does not import neo4j so SEC-02 check does not apply |

No blocker or warning anti-patterns found. The single f-string is an info-level finding with no security impact.

### Human Verification Required

#### 1. End-to-End docker-compose Flow

**Test:** Run `docker-compose up`, wait for all services to reach healthy state, then `curl -X POST http://localhost:8000/api/generate -H "Authorization: Bearer $VALID_JWT" -H "Content-Type: application/json" -d '{"input": "Paradigm Capital led a $50M Series A round in Uniswap v4 with participation from a16z crypto and Coinbase Ventures. General Partner Matt Huang announced the deal..."}'` (ensure input >= 200 chars)
**Expected:** 200 response with `graph.nodes` containing Investor (Paradigm Capital, a16z crypto, Coinbase Ventures), Project (Uniswap v4), and Round nodes; `graph.edges` with LED, INVESTED_IN, RAISED relationships; `meta.source_type = "text"`; Neo4j browser at http://localhost:7474 shows Entity nodes with session_id property
**Why human:** Requires live Docker environment, real OPENAI_API_KEY, real Neo4j, and a valid Clerk JWT configured in `.env`

#### 2. Live SSRF Rejection via curl

**Test:** With server running, `curl -X POST http://localhost:8000/api/generate -H "Authorization: Bearer $VALID_JWT" -H "Content-Type: application/json" -d '{"input": "https://127.0.0.1/secret"}'`
**Expected:** `{"detail": {"error": "invalid_url", "message": "URL resolves to a blocked address"}}` with HTTP 400
**Why human:** Verifies the full request path from HTTP to SSRF guard; unit tests mock socket.gethostbyname but this confirms live DNS resolution path

### Gaps Summary

No gaps found. All 5 observable truths are verified. All 10 requirements for Phase 1 are satisfied. All key links are wired. The test suite passes with 29/29 tests green (0 failures, 0 errors, 0.74s runtime).

The only intentional partial delivery is AI-02's Redis caching sub-requirement, which is correctly scoped to Phase 4 per the roadmap and all planning documents.

---
_Verified: 2026-02-25_
_Verifier: Claude (gsd-verifier)_
