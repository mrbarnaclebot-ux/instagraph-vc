---
phase: 01-backend-foundation
plan: 03
subsystem: api
tags: [fastapi, beautifulsoup, lxml, requests, neo4j, cypher, ssrf, security, pytest, python, scraper]

# Dependency graph
requires:
  - phase: 01-backend-foundation/01-01
    provides: apps/api/ FastAPI skeleton with Neo4j driver singleton, app/graph/ and app/scraper/ stubs
  - phase: 01-backend-foundation/01-02
    provides: validate_url() SSRF guard used as first call in scrape_url()
provides:
  - scrape_url() — SSRF-aware URL scraper with BeautifulSoup lxml extraction, Chrome UA spoofing, 32k char cap, 500-char minimum yield check, and redirect chain validation through validate_url()
  - _extract_text() — strips script/style/nav/footer/header/aside tags, extracts h1/h2/h3 headings + article body + p paragraphs via lxml
  - persist_graph() — UNWIND batch inserts to Neo4j with exclusively parameterized Cypher ($nodes, $edges, $session_id); no string interpolation anywhere
  - get_graph_by_session() — parameterized retrieval of all nodes and edges by session_id
  - 9-test pytest suite covering HTML extraction variants, SSRF redirect handling, low-content rejection, and 503 timeout
affects:
  - 01-05 (generate endpoint — calls scrape_url() for URL inputs and persist_graph() after GPT-4o extraction)
  - Phase 4 (Redis caching — Phase 4 will wrap scrape_url() with a Redis cache check in generate/service.py for the deferred AI-02 sub-requirement)

# Tech tracking
tech-stack:
  added:
    - beautifulsoup4 (HTML parsing)
    - lxml (fast HTML parser backend for BeautifulSoup)
    - requests (HTTP client for URL fetching; already present but now used with allow_redirects=False)
  patterns:
    - allow_redirects=False on every requests.get() call — redirect Location headers validated through validate_url() before following
    - Redirect chain limit of 5 hops — prevents infinite redirect loops
    - Chrome User-Agent spoofing constant (CHROME_UA) for bot-detection bypass on news sites
    - BeautifulSoup decompose() for boilerplate removal before text extraction
    - UNWIND batch Cypher pattern — single query for all nodes, single query for all edges
    - Relationship type stored as property (r.type) rather than dynamic Cypher label — avoids apoc.create.relationship() and maintains strict parameterization
    - driver.session() context manager for all Neo4j operations — ensures connection cleanup

key-files:
  created:
    - apps/api/app/scraper/scraper.py
    - apps/api/app/graph/repository.py
    - apps/api/tests/test_scraper.py
  modified: []

key-decisions:
  - "lxml chosen over html.parser for BeautifulSoup — faster on large news articles (TechCrunch, CoinDesk)"
  - "Relationship type stored as RELATES_TO property (r.type) not dynamic Cypher type — eliminates dynamic label injection without needing apoc.create.relationship()"
  - "Redirect chain validated hop-by-hop through validate_url() — prevents redirect-based SSRF bypass while still following legitimate redirects"
  - "AI-02 Redis caching sub-requirement deferred to Phase 4 alongside RATE-03 where Upstash Redis infrastructure is provisioned"
  - "AI-03 (raw text source type) is handled at the caller level — scrape_url() is only invoked when source_type='url'; raw text bypasses it entirely in generate/service.py"

patterns-established:
  - "SSRF-aware HTTP: validate_url() before any requests.get(), allow_redirects=False always, redirect chain re-validated"
  - "Zero string interpolation in Cypher: all dynamic values via $param syntax — grep for .format( and f\" returns empty on repository.py"
  - "UNWIND batch writes: single parameterized query per entity class (nodes, edges) rather than per-record loops"

requirements-completed: [AI-02, AI-03, SEC-02]

# Metrics
duration: ~5min
completed: 2026-02-25
---

# Phase 1 Plan 03: BeautifulSoup Scraper + Parameterized Neo4j Repository Summary

**SSRF-aware BeautifulSoup scraper with redirect chain validation and fully parameterized Neo4j UNWIND batch repository — eliminating Cypher injection from the inherited Flask codebase**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-25
- **Completed:** 2026-02-25
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `scrape_url()` fetches public HTTPS URLs with `allow_redirects=False`, validates every redirect hop through the SSRF guard, strips HTML boilerplate via BeautifulSoup + lxml, and enforces a 32k char cap and 500-char minimum yield check
- `persist_graph()` and `get_graph_by_session()` use exclusively parameterized Cypher with `UNWIND $nodes` / `UNWIND $edges` batch patterns — zero `.format()` or f-strings in `repository.py`
- 9 pytest tests pass across `TestExtractText` (5 tests: article extraction, script stripping, nav/footer stripping, heading extraction, string return) and `TestScrapeUrl` (4 tests: extracted text return, low-content rejection, `allow_redirects=False` assertion, timeout 503)

## Task Commits

Each task was committed atomically:

1. **Task 1: BeautifulSoup URL scraper with SSRF guard** - `a1da92e` (feat)
2. **Task 2: Parameterized Neo4j graph repository** - `849b2bc` (feat)

## Files Created/Modified

- `apps/api/app/scraper/scraper.py` — `scrape_url()` with SSRF redirect chain validation, Chrome UA spoofing, BeautifulSoup lxml extraction; `_extract_text()` helper stripping boilerplate and extracting headings/article/paragraphs
- `apps/api/app/graph/repository.py` — `persist_graph()` (UNWIND batch node + edge inserts) and `get_graph_by_session()` (parameterized node + edge fetch), all Cypher via `$param` syntax only
- `apps/api/tests/test_scraper.py` — 9 tests across `TestExtractText` and `TestScrapeUrl` classes, mocking `validate_url` and `requests.get` via `unittest.mock`

## Decisions Made

- **lxml over html.parser:** Faster on large news articles (TechCrunch, CoinDesk, The Block); explicit in `BeautifulSoup(html, "lxml")` call.
- **Relationship type as property not label:** `RELATES_TO` is the fixed Cypher relationship type; `r.type` property stores the semantic type (LED, INVESTED_IN, etc.). Avoids dynamic label injection without needing `apoc.create.relationship()`.
- **Redirect chain hop-by-hop validation:** Each `Location` header is passed through `validate_url()` before `requests.get()` follows it. Max 5 hops prevents infinite loops.
- **AI-02 Redis caching deferred to Phase 4:** The Redis caching sub-requirement ("cache raw scraped text for 1 hour") is out of scope here. Phase 4 will wrap `scrape_url()` in `generate/service.py` with a Redis cache check alongside RATE-03.
- **AI-03 handled at caller level:** `scrape_url()` is only invoked when `source_type="url"`. Raw text bypasses it entirely — this is documented in the docstring for `generate/service.py` implementors (Plan 05).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `scrape_url()` is ready for Plan 05 to wire into the generate endpoint for URL inputs
- `persist_graph()` is ready for Plan 05 to call after GPT-4o returns the graph structure
- `get_graph_by_session()` is ready for the generate endpoint response and Phase 3 history retrieval
- Redis URL caching (AI-02 sub-requirement) remains open for Phase 4 — no blocker for Phase 1 completion

---
*Phase: 01-backend-foundation*
*Completed: 2026-02-25*
