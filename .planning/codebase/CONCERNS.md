# Codebase Concerns

**Analysis Date:** 2026-02-25

## Tech Debt

**Global Variable State Management:**
- Issue: The Flask application uses global variables (`response_data`, `driver`) to maintain state across requests, which creates race conditions in multi-threaded environments
- Files: `main.py` (lines 28, 31, 100, 173, 202)
- Impact: Concurrent requests will overwrite each other's response data, leading to data loss or incorrect graph visualization for simultaneous users
- Fix approach: Implement proper session management using Flask sessions or a database backend to store per-user graph data. Replace global variables with request-scoped context storage

**Deprecated OpenAI API Usage:**
- Issue: Code uses deprecated OpenAI API (`openai.ChatCompletion.create()`) from the legacy `openai` package version ^0.28.0 instead of the current `openai` library
- Files: `main.py` (lines 121-130), `pyproject.toml` (line 9)
- Impact: The old API client will stop working as OpenAI deprecates legacy endpoints; incompatible with modern OpenAI authentication and error handling patterns
- Fix approach: Migrate to the latest `openai` library (>=1.0.0) with `client.chat.completions.create()` method and update authentication to use API key via client initialization

**SQL Injection Risk in Graph Queries:**
- Issue: Query parameters are inserted using string formatting (`.format()`) instead of parameterized queries
- Files: `drivers/neo4j.py` (lines 76-78), `drivers/falkordb.py` (lines 63-67)
- Impact: Malicious user input in graph history pagination could execute arbitrary Cypher queries against the database
- Fix approach: Use parameterized query bindings provided by Neo4j and FalkorDB drivers instead of string formatting

**JSON Processing Error Handling:**
- Issue: The `correct_json()` function catches and silently returns `None` on JSON decode errors, but callers don't properly validate the return value
- Files: `main.py` (lines 81-95, 132-133)
- Impact: `None` returned from `correct_json()` on error isn't checked before being assigned to `response_data`, causing AttributeError downstream when accessing response_data["edges"]
- Fix approach: Raise explicit exceptions from `correct_json()` or implement proper validation of return values before use

**Bare Exception Handlers:**
- Issue: Multiple catch-all `except Exception:` blocks without specific handling or re-raising
- Files: `main.py` (lines 148, 158, 228, 277), `drivers/neo4j.py` (line 135), `drivers/falkordb.py` (line 126)
- Impact: Masks actual errors, makes debugging difficult, and allows invalid application state to persist silently
- Fix approach: Catch specific exception types and provide meaningful error responses; log stack traces for debugging

## Known Bugs

**Edge "from_" Field Mapping Issue:**
- Symptoms: Edges have a field named `from_` in the model but the database and API expect `from`, requiring manual remapping
- Files: `models.py` (lines 27-28), `main.py` (lines 138-142)
- Trigger: Any edge normalization or database query that uses the `from` field will fail unless the workaround is applied
- Workaround: Current code maps `from_` to `from` after response, but this is fragile if the response format changes

**Unused Database Query Results:**
- Symptoms: Graph data endpoints sometimes return query execution results instead of formatted node/edge data
- Files: `drivers/neo4j.py` (lines 91-98, 100-111), `drivers/falkordb.py` (lines 82-89, 91-102)
- Trigger: When storing data via `get_response_data()`, the function returns raw query results instead of parsed node/edge data
- Workaround: Callers don't currently use the return value, but this is confusing and breaks the interface contract

**URL Scraping Without Timeout:**
- Symptoms: Web scraping endpoint can hang indefinitely on unresponsive servers
- Files: `main.py` (line 38)
- Trigger: POST to `/get_response_data` with a URL to a slow or non-responsive domain
- Workaround: None - will block Flask thread until request times out at OS level

## Security Considerations

**Hardcoded Default Database URL:**
- Risk: FalkorDB driver defaults to `redis://localhost:6379` if FALKORDB_URL env var is not set, potentially connecting to wrong database or exposing connection details
- Files: `drivers/falkordb.py` (line 12)
- Current mitigation: Expects explicit environment configuration, but defaults silently on misconfiguration
- Recommendations: Raise ValueError if required env vars are missing (like Neo4j driver does), don't fallback to localhost defaults

**Missing Authentication for Graph Endpoints:**
- Risk: All graph endpoints (`/get_response_data`, `/get_graph_data`, `/get_graph_history`, `/graphviz`) are publicly accessible with no authentication or rate limiting beyond basic free plan check
- Files: `main.py` (routes at lines 98, 171, 196, 232)
- Current mitigation: Optional rate limit header added for free plan, but no actual rate limiting library
- Recommendations: Implement proper rate limiting using a library like `flask-limiter`, add API key validation, or implement user authentication

**Unvalidated User Input to LLM:**
- Risk: User input is sent directly to OpenAI without validation or sanitization
- Files: `main.py` (lines 101-117)
- Current mitigation: None
- Recommendations: Validate input length, filter for malicious prompts, implement content filtering before sending to OpenAI API

**Credentials Exposure in Logs:**
- Risk: Database credentials could be logged in error messages if connection fails
- Files: `drivers/neo4j.py` (line 29), `drivers/falkordb.py` (line 20)
- Current mitigation: Logging doesn't currently expose credentials, but error messages are generic
- Recommendations: Ensure credentials are never logged; use safe error messages for user-facing endpoints

## Performance Bottlenecks

**Blocking Web Scraping:**
- Problem: Web scraping in request handler blocks the entire Flask thread, preventing concurrent requests
- Files: `main.py` (lines 37-45, 104-105)
- Cause: `requests.get()` is synchronous and network-bound
- Improvement path: Move scraping to background job queue (Celery), implement async/await with aiohttp, or add configurable timeout

**No Pagination for Graph Data Retrieval:**
- Problem: `get_graph_data()` fetches all nodes and edges from database without pagination or filtering
- Files: `main.py` (lines 199-226), `drivers/neo4j.py` (lines 34-56), `drivers/falkordb.py` (lines 23-40)
- Cause: Query selects all records with MATCH (n) and MATCH (s)-[r]->(t) without LIMIT
- Improvement path: Implement pagination with LIMIT/SKIP, add filtering by date range, cache frequently accessed graphs

**Inefficient Graph History Query:**
- Problem: Fetches raw records and processes each one with Python function, no aggregation or filtering at database level
- Files: `drivers/neo4j.py` (lines 58-85), `drivers/falkordb.py` (lines 42-76)
- Cause: Full scan of all relationships with Python-side pagination
- Improvement path: Implement LIMIT/SKIP at query level, add database-side filtering and sorting

## Fragile Areas

**Driver Initialization with Silent Fallback:**
- Files: `main.py` (lines 269-278)
- Why fragile: If graph driver fails, it falls back to `None` without warning, causing different behavior in graph endpoints downstream
- Safe modification: Add explicit mode checking before calling driver methods, improve error logging, make driver optional explicit rather than implicit
- Test coverage: No tests for Neo4j/FalkorDB initialization failures or fallback behavior

**Response Data Serialization:**
- Files: `main.py` (lines 132-142)
- Why fragile: Assumes specific response structure from OpenAI and pydantic model, edge field names require manual remapping
- Safe modification: Add validation/assertions for response structure before processing, create dedicated serialization functions
- Test coverage: No tests for malformed OpenAI responses or unexpected model outputs

**Exception Handling in Critical Path:**
- Files: `main.py` (lines 153-165)
- Why fragile: Database operations wrapped in broad try-catch that may hide real errors or connection issues
- Safe modification: Log full stack traces, raise specific exception types, add database connection health checks
- Test coverage: No tests for database failures or partial failure scenarios

**Bare Exception Catching in Graph History:**
- Files: `main.py` (lines 232-251)
- Why fragile: Gracefully returns empty results on any error, making it hard to diagnose actual problems
- Safe modification: Log specific error reasons, distinguish between no data and actual errors
- Test coverage: No tests for exception scenarios in history retrieval

## Scaling Limits

**Single-Process Flask Application:**
- Current capacity: ~10-50 concurrent requests depending on LLM API latency
- Limit: Blocks on network I/O (OpenAI API, web scraping, database queries)
- Scaling path: Deploy with multi-worker setup (Gunicorn with 4+ workers), implement async request handling, use task queues for LLM processing

**In-Memory Graph State:**
- Current capacity: Single graph in `response_data` global variable
- Limit: Only one user interaction at a time; concurrent requests cause data loss
- Scaling path: Move to database or Redis backend, implement session storage, use request context for per-user state

**No Connection Pooling:**
- Current capacity: Fresh database connection per graph operation
- Limit: Connection overhead grows with request volume, database connection limits exhausted quickly
- Scaling path: Implement connection pooling in Neo4j/FalkorDB drivers, reuse driver instances

## Dependencies at Risk

**Deprecated OpenAI Package (^0.28.0):**
- Risk: Legacy API client with deprecated endpoints, will break when OpenAI removes support
- Impact: Application cannot fetch knowledge graphs, complete failure of core functionality
- Migration plan: Upgrade to `openai>=1.0.0`, refactor to use new `client.chat.completions.create()` API, update error handling for new exception types

**Python Version Constraint (>=3.10.0,<3.11):**
- Risk: Locks to Python 3.10, prevents upgrading to 3.11+ for security patches and performance improvements
- Impact: Security vulnerabilities in older Python versions remain unpatched
- Migration plan: Test on Python 3.11+, update `pyproject.toml` to allow newer versions, verify dependency compatibility

**Unmaintained BeautifulSoup4 Implicit Dependency:**
- Risk: `bs4` package version ^0.0.1 is a dummy package; actual code uses `beautifulsoup4`
- Impact: Web scraping may fail if dummy package is removed or dependencies are re-resolved
- Migration plan: Replace `bs4` with explicit `beautifulsoup4` dependency, add proper version constraint

## Missing Critical Features

**No Error Recovery:**
- Problem: Failed LLM requests return immediately without retry logic
- Blocks: Users cannot recover from transient OpenAI API failures
- Recommendation: Implement exponential backoff retry mechanism for rate limit errors

**No Input Validation:**
- Problem: URL and text input are not validated before processing
- Blocks: Invalid URLs cause unhandled exceptions, oversized inputs exhaust tokens
- Recommendation: Add input sanitization, length limits, URL format validation

**No Persistence Between Sessions:**
- Problem: Graphs only exist in memory for current session; closing browser loses all data
- Blocks: Users cannot save or share graphs, no history without database
- Recommendation: Implement user session storage or graph persistence layer

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: Graph data formatting, JSON correction logic, driver initialization, error handling paths
- Files: All Python files lack test coverage
- Risk: Regressions in core functionality go undetected, refactoring is unsafe
- Priority: High - Core functions like `correct_json()`, `get_response_data()` need unit tests

**No Integration Tests:**
- What's not tested: OpenAI API integration, Neo4j/FalkorDB driver operations, Flask routes end-to-end
- Files: All routes in `main.py` and driver classes
- Risk: Database operations may fail silently, API integration changes break undetected
- Priority: High - Need integration test suite for database drivers and API endpoints

**No Web Scraping Tests:**
- What's not tested: URL validation, scraping error handling, malformed HTML parsing
- Files: `main.py` (lines 37-45)
- Risk: Scraping failures cause unhandled exceptions, broken URLs not caught early
- Priority: Medium - Add tests for common scraping failure modes

**No API Route Tests:**
- What's not tested: Request parameter validation, response format consistency, error responses
- Files: `main.py` (routes at lines 98, 171, 196, 232, 254)
- Risk: API contract changes break clients, invalid requests cause 500 errors instead of 400
- Priority: High - Implement Flask test suite covering all routes and error cases

---

*Concerns audit: 2026-02-25*
