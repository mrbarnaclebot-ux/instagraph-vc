# Pitfalls Research

**Domain:** AI-powered crypto VC knowledge graph SaaS (URL scraping, LLM entity extraction, graph visualization)
**Researched:** 2026-02-25
**Confidence:** HIGH (verified against official docs, OWASP, Neo4j driver manual, Clerk docs, Cytoscape.js docs)

## Critical Pitfalls

### Pitfall 1: SSRF via DNS Rebinding in URL Scraper

**What goes wrong:**
Naive SSRF protection that validates the URL's resolved IP before making the request is vulnerable to DNS rebinding. An attacker registers a domain with a low-TTL DNS record: the first resolution returns a public IP (passes validation), the second resolution (when `requests.get()` actually connects) returns `127.0.0.1`, `169.254.169.254` (AWS IMDS), or an internal Railway service IP. This is a classic time-of-check-to-time-of-use (TOCTTOU) vulnerability.

**Why it happens:**
Developers validate the IP from `socket.getaddrinfo()`, then pass the original URL to `requests.get()`, which performs its own DNS resolution. Between the two lookups, the DNS record changes. The Python `requests` library has no built-in SSRF protection.

**How to avoid:**
1. Resolve DNS once, validate the IP, then connect to the resolved IP directly (not the hostname). Pass the original `Host` header manually.
2. Block all private/reserved ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (link-local/cloud metadata), `::1/128`, `fc00::/7`.
3. Disable HTTP redirects (`allow_redirects=False`) -- redirects can point to internal IPs after initial validation passes.
4. Restrict URL schemes to `http` and `https` only (block `file://`, `ftp://`, `gopher://`).
5. Set a strict timeout (5-10 seconds) on `requests.get()` to prevent slow-loris style resource exhaustion.
6. Use `ipaddress.ip_address(resolved_ip).is_global` as a check, but only when combined with single-resolution-and-connect pattern above.

**Warning signs:**
- URL validation code calls `socket.getaddrinfo()` separately from `requests.get()`.
- No redirect following disabled on the HTTP client.
- No scheme validation (accepts `file://`, `gopher://`).
- Tests only check against `localhost` and `127.0.0.1`, not against `169.254.169.254` or IPv6 loopback.

**Phase to address:**
Phase 1 (Backend Foundation) -- SSRF protection must be baked into the scraping layer from day one, not bolted on later.

---

### Pitfall 2: Cypher Injection via String Interpolation in Neo4j Queries

**What goes wrong:**
The existing codebase uses Python `.format()` for Cypher query parameters (documented in CONCERNS.md, `drivers/neo4j.py` lines 76-78). An attacker passing crafted input through the graph history pagination or entity names can execute arbitrary Cypher -- reading other users' graphs, deleting data, or exfiltrating the entire database.

**Why it happens:**
Neo4j's Cypher query language looks like SQL but developers sometimes treat it more casually. String formatting feels natural when building dynamic queries, especially for pagination (`SKIP {offset} LIMIT {limit}`).

**How to avoid:**
Use parameterized queries exclusively. Every Cypher query must use `$param` syntax:
```python
# WRONG
session.run(f"MATCH (n) RETURN n SKIP {skip} LIMIT {limit}")

# RIGHT
session.run("MATCH (n) RETURN n SKIP $skip LIMIT $limit", skip=skip, limit=limit)
```
Add a linting rule or code review checklist item: zero `.format()` or f-string usage in any file that calls `session.run()`.

**Warning signs:**
- Any `.format()`, `%s`, or f-string in a file importing `neo4j`.
- Query parameters not appearing as `$param_name` in Cypher strings.
- No input validation on pagination parameters (skip/limit should be positive integers).

**Phase to address:**
Phase 1 (Backend Foundation) -- this is an existing vulnerability in the codebase that must be fixed during the Flask-to-FastAPI port.

---

### Pitfall 3: GPT-4o Hallucinating Entities and Relationships in VC Data

**What goes wrong:**
GPT-4o generates plausible-sounding but fabricated investor names, funding amounts, or relationships. For crypto VC data this is especially dangerous because: (a) many entities have similar names (e.g., "Paradigm" the VC vs. unrelated uses of "paradigm"), (b) funding round amounts are frequently misattributed, (c) the model confidently invents co-investment relationships that never existed. Research shows GPT-4o hallucination rates of ~23% even with mitigation prompts (down from ~53% baseline).

**Why it happens:**
LLMs generate text probabilistically. When input text is ambiguous or lacks explicit relationship markers, the model fills gaps with training data patterns rather than admitting uncertainty. Structured output (via instructor/Pydantic) forces the model to always produce entities -- it cannot return "I'm not sure" for a required field, so it fabricates.

**How to avoid:**
1. Make all entity fields in the Pydantic model optional or use `confidence: float` fields. Allow the model to express uncertainty.
2. Add a `source_snippet: str` field to each entity/relationship -- forces the model to cite the input text, making hallucinations detectable.
3. Post-process: reject entities where `confidence < 0.7` or where `source_snippet` doesn't appear in the input text.
4. Use instructor's `max_retries` with validation: if extracted entities fail verification against the source text, retry with feedback.
5. For crypto-specific entities, maintain a known-entities reference list (top 200 VCs, top 500 projects) and flag extractions that don't match.
6. Cap input at 32k chars (already planned) but also consider chunking long articles and merging results, since GPT-4o loses accuracy in the middle of long contexts.

**Warning signs:**
- Users report incorrect investor attributions or fabricated funding amounts.
- Entity names in the graph don't appear in the source URL/text when spot-checked.
- The same generic entities ("Blockchain Fund", "Crypto Ventures") appear across unrelated inputs.
- No validation pipeline exists between LLM output and Neo4j persistence.

**Phase to address:**
Phase 2 (AI/Graph Generation) -- entity extraction quality is the core value proposition. Build validation pipeline before scaling usage.

---

### Pitfall 4: Clerk JWT Validation Missing `azp` Claim Check (CSRF Vulnerability)

**What goes wrong:**
The FastAPI backend validates the JWT signature and expiration but does not verify the `azp` (authorized party) claim. An attacker's site can obtain a Clerk session token (if the user is logged into Clerk on another app using the same Clerk instance) and replay it against your API. Clerk's own documentation explicitly warns: failing to validate `azp` opens your application to CSRF attacks.

**Why it happens:**
Most JWT tutorials only cover `exp` and `iss` validation. The `azp` claim is Clerk-specific and not part of standard JWT RFCs. Developers copy generic JWT validation code and miss this Clerk-specific requirement.

**How to avoid:**
1. Use the `fastapi-clerk-auth` PyPI package or `fastapi-clerk-middleware` which handle `azp` validation.
2. If doing manual validation: after verifying signature, explicitly check `azp` matches your frontend's origin (`https://your-app.vercel.app`).
3. Validate the `sts` (status) claim -- reject tokens where `sts === "pending"` if using Clerk Organizations.
4. Fetch JWKS from `https://<your-clerk-frontend-api>/.well-known/jwks.json` and cache with TTL (rotate keys don't break sessions).
5. Set `authorized_parties` as an environment variable, not hardcoded, so staging/production have different values.

**Warning signs:**
- JWT validation code only checks `exp` and signature.
- No `azp` or `authorized_parties` configuration in the auth middleware.
- Auth works "fine" in development but you haven't tested cross-origin token replay.
- Using a generic PyJWT decode without Clerk-specific claim checks.

**Phase to address:**
Phase 1 (Backend Foundation) -- authentication is foundational. Get it right before building protected endpoints.

---

### Pitfall 5: Neo4j Driver Instance Created Per-Request Instead of Per-Application

**What goes wrong:**
Creating a new `neo4j.GraphDatabase.driver()` instance per FastAPI request exhausts Neo4j Aura's connection limits (default: 100 concurrent connections on Free tier, 200 on Pro). Each driver instance creates its own connection pool. Under moderate load (20+ concurrent graph generations), the app hits connection limits, returning `ClientError: connection pool exhausted` or silent timeouts.

**Why it happens:**
In the existing Flask codebase, the driver is a global variable (which actually works for connection reuse, but has race condition issues). When porting to FastAPI, developers often create the driver inside dependency injection functions or route handlers, inadvertently creating a new pool per request.

**How to avoid:**
1. Create exactly ONE `AsyncGraphDatabase.driver()` instance at application startup (in a FastAPI lifespan handler).
2. Configure pool size explicitly: `max_connection_pool_size=50` (leave headroom below Aura's limit).
3. Set `connection_acquisition_timeout=30` (seconds) -- fail fast rather than hang indefinitely.
4. Set `max_connection_lifetime=3600` (1 hour) -- prevents stale connections on Railway where containers may be recycled.
5. Use `async with driver.session() as session:` context managers for every operation -- sessions are cheap, drivers are expensive.
6. Add a health check endpoint that calls `driver.verify_connectivity()` to detect connection issues early.

**Warning signs:**
- `neo4j.GraphDatabase.driver()` or `AsyncGraphDatabase.driver()` called anywhere except application startup.
- No `max_connection_pool_size` configuration (defaults to 100, which is the Aura Free tier limit -- zero headroom).
- Missing `async with` context manager around sessions (leaked sessions = leaked connections).
- Railway logs showing connection timeout errors under moderate load.

**Phase to address:**
Phase 1 (Backend Foundation) -- driver lifecycle is part of the FastAPI application scaffold.

---

### Pitfall 6: Cytoscape.js Canvas Memory Leak on Graph Re-renders

**What goes wrong:**
Each time a user generates a new graph or navigates between saved graphs, Cytoscape creates a new canvas allocation. Without explicit cleanup, the browser accumulates canvas memory. After 5-10 graph views in a single session, the tab consumes 500MB+ RAM, causing jank and eventual tab crash -- especially on mobile devices.

**Why it happens:**
React/Next.js component lifecycle doesn't automatically call `cy.destroy()`. When the Cytoscape component re-mounts (route change, state update), the old instance's canvas remains in memory. The Cytoscape.js docs note that `cy.destroy()` is actually worse than recycling the instance because it grows the heap and triggers expensive garbage collection.

**How to avoid:**
1. Use a single Cytoscape instance per session. Recycle it with `cy.elements().remove()` then `cy.add(newElements)` instead of destroying and recreating.
2. If using a React wrapper, ensure `useEffect` cleanup calls `cy.destroy()` or recycles on unmount.
3. Enable `hideEdgesOnViewport: true` for graphs with 500+ edges.
4. Set `pixelRatio: 1` instead of `'auto'` -- halves memory on Retina displays.
5. Use `haystack` curve style instead of `bezier` for edges (2x faster rendering).
6. Consider the new WebGL renderer (Cytoscape.js 3.31+, January 2025) for graphs with 1000+ nodes -- moves rendering to GPU.

**Warning signs:**
- Browser DevTools Memory tab shows sawtooth pattern that never returns to baseline.
- Multiple `<canvas>` elements in the DOM for a single graph view.
- No `cy.destroy()` or instance recycling in component cleanup.
- Users on mobile report the page freezing after viewing several graphs.

**Phase to address:**
Phase 3 (Frontend/Visualization) -- must be built into the Cytoscape React component from the start.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip SSRF protection for MVP | Ship faster | One security incident = reputation loss, potential data breach via cloud metadata | Never -- SSRF protection is <1 day of work |
| Store graph metadata in Neo4j instead of Supabase | One fewer database | Neo4j is not optimized for tabular queries (user lists, graph indexes, audit logs); queries become slow and awkward | Never -- the project already plans Supabase for metadata |
| Use `instructor` with `max_retries=0` | Faster responses | Bad extractions go straight to the database unchecked; users see garbage graphs | Only during local development/testing |
| Skip rate limiting for MVP | Ship faster | One viral tweet = API bill spike from GPT-4o calls ($0.005/1K input tokens adds up fast) | Never -- Upstash Redis rate limiting is trivial to implement |
| Hardcode Clerk `authorized_parties` | Quick auth setup | Breaks when deploying to staging/preview environments with different URLs | Never -- use environment variables |
| Global error handler returns 500 for everything | Simple error handling | Hides actual issues; users can't distinguish between "your input was bad" and "our server crashed" | Only in first sprint, must add proper error responses before beta |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Clerk + FastAPI | Using `PyJWT` to decode without fetching JWKS; hardcoding the public key | Use `PyJWKClient` to fetch from `/.well-known/jwks.json` with caching; or use `fastapi-clerk-auth` package |
| Clerk + FastAPI | Not passing `Authorization: Bearer <token>` from Next.js API routes when proxying to FastAPI | Next.js middleware must forward the Clerk session token in the Authorization header on every backend call |
| Neo4j Aura + Railway | Assuming the connection string works without `+s` (TLS) scheme | Neo4j Aura requires `neo4j+s://` scheme (encrypted); plain `neo4j://` will fail silently or timeout |
| Neo4j Aura Free | Expecting the database to be always-on | Aura Free pauses after 3 days of inactivity; first request after pause takes 30-60 seconds to wake. Add a keep-alive cron or handle cold start gracefully |
| OpenAI + instructor | Using `response_model=KnowledgeGraph` without `max_retries` | Set `max_retries=3` with validation to catch malformed/hallucinated outputs; without it, first failure = user error |
| Upstash Redis | Creating a new Redis client per request | Use the `@upstash/redis` REST client (HTTP-based, no persistent connections needed) -- different from traditional Redis clients |
| Vercel + Railway | Assuming same-origin; not configuring CORS | Frontend on `*.vercel.app`, backend on `*.railway.app` -- different origins. Configure FastAPI CORS middleware with explicit allowed origins |
| Sentry + FastAPI | Adding Sentry SDK but not configuring `traces_sample_rate` | Set `traces_sample_rate=0.1` (10%) for production; 1.0 will exhaust Sentry quota in hours |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all nodes/edges without pagination from Neo4j | Graph endpoint returns in 200ms for 50 nodes, 8 seconds for 2000 nodes | Use `LIMIT`/`SKIP` in Cypher; load graph in chunks; paginate history queries at DB level | 500+ nodes per graph |
| Synchronous URL scraping blocking FastAPI event loop | Other requests queue behind a slow scrape; 30s scrape = 30s wait for all users | Use `httpx.AsyncClient` (not `requests`) inside async route handlers | 5+ concurrent users |
| Sending entire scraped page text to GPT-4o | Token cost explodes; 32k chars ~8k tokens input = $0.04/request; at 1000 req/day = $40/day | Extract only relevant text (article body, not nav/footer); use `readability-lxml` or similar | 100+ daily active users |
| Loading full Cytoscape graph in React state | Component re-renders on every state change; 1000-node graph = 1000ms re-render | Store graph data in a ref, not state; only trigger re-renders for UI state (selected node, sidebar) | 200+ nodes |
| No Redis caching for repeated URL scrapes | Same trending article submitted by 50 users = 50 identical scrapes + 50 GPT-4o calls | Cache scraped text by URL hash in Redis with 1-hour TTL (already planned) | Any viral content |
| Running `cose` layout on large graphs synchronously | Layout computation blocks main thread; 1000+ nodes = 2-5 second freeze | Use `cose-bilkent` (Web Worker-based) or pre-compute layout server-side | 500+ nodes |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No URL scheme validation before scraping | Attacker submits `file:///etc/passwd` or `gopher://internal-service` | Allowlist `http://` and `https://` only; reject all other schemes before any processing |
| Storing raw scraped HTML in database | XSS if HTML is ever rendered; storage bloat | Store extracted text only; strip all HTML tags before persistence |
| Echoing LLM output directly to frontend without sanitization | XSS via prompt injection -- attacker crafts article text that makes GPT-4o output `<script>` tags in entity names | Sanitize all entity names/properties before rendering; escape HTML in graph labels |
| Not validating `created_by` on graph read/delete | User A can view/delete User B's graphs by guessing graph IDs | Every Neo4j query must include `WHERE g.created_by = $user_id`; never trust client-supplied user identity |
| Logging full request bodies including scraped content | Sensitive financial data in logs; GDPR exposure if scraping EU content | Log request metadata (URL, user_id, timestamp) but never full request/response bodies |
| No robots.txt checking before scraping | Legal liability; IP blocks from target sites | Check `robots.txt` before scraping; respect `Disallow` directives; add `User-Agent` identifying your bot |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing a loading spinner for 15-30s during graph generation with no progress feedback | Users assume the app is broken and refresh/leave | Stream progress: "Scraping URL...", "Extracting entities...", "Building graph..." -- use SSE or polling |
| Dumping 200+ nodes onto the canvas at once without progressive disclosure | Overwhelming, unreadable graph; users don't know where to look | Show top-level entities first (Investors, Projects); reveal relationships on click/expand |
| No empty state guidance when graph generation produces few/no entities | User sees a nearly empty canvas and thinks the tool is broken | Show "We found X entities. Try pasting a more detailed funding announcement for richer graphs." |
| Auto-layout that obscures node labels | Users can't read the graph without manual rearrangement | Use `cose-bilkent` with `nodeDimensionsIncludeLabels: true`; increase `idealEdgeLength` |
| No way to undo/redo graph manipulation | Users accidentally delete nodes or lose their arrangement | Implement undo stack for manual graph edits (at minimum, "reset layout" button) |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **SSRF Protection:** Often missing redirect-following validation -- verify that redirects are also checked against private IP ranges
- [ ] **SSRF Protection:** Often missing IPv6 validation -- verify `::1`, `::ffff:127.0.0.1`, and IPv6-mapped IPv4 addresses are blocked
- [ ] **Auth Middleware:** Often missing token refresh handling -- verify that expired-but-refreshable tokens return 401 (not 500)
- [ ] **Neo4j Queries:** Often missing `created_by` filter on read queries -- verify every graph query is user-scoped
- [ ] **Rate Limiting:** Often missing distinction between anonymous and authenticated limits -- verify both paths work
- [ ] **Graph Export (PNG):** Often missing high-DPI handling -- verify export looks correct on Retina displays
- [ ] **Error Responses:** Often missing structured error format -- verify all 4xx/5xx responses return `{"error": "message", "code": "ERROR_CODE"}`
- [ ] **CORS:** Often missing preflight (OPTIONS) handling -- verify actual cross-origin requests work, not just same-origin dev
- [ ] **Entity Extraction:** Often missing validation that extracted entities actually appear in source text -- verify hallucination detection exists
- [ ] **Neo4j Connection:** Often missing TLS configuration for Aura -- verify connection uses `neo4j+s://` scheme

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SSRF exploited (cloud metadata accessed) | HIGH | Rotate all credentials immediately; audit access logs; add SSRF protection; rotate API keys for OpenAI, Neo4j, Clerk |
| Cypher injection (data exfiltrated) | HIGH | Rotate Neo4j credentials; audit query logs; parameterize all queries; assess data exposure scope |
| Hallucinated entities in production database | MEDIUM | Add `verified: boolean` field to entities retroactively; build admin tool to flag/remove bad entities; add validation pipeline going forward |
| Neo4j connection pool exhaustion | LOW | Restart Railway service; reduce `max_connection_pool_size`; add connection acquisition timeout; verify single driver instance |
| Cytoscape memory leak causing crashes | LOW | Add `cy.destroy()` cleanup; deploy fix; users just refresh browser |
| Clerk JWT bypass (missing `azp`) | MEDIUM | Add `azp` validation; audit access logs for unauthorized API calls; no data corruption but potential unauthorized reads |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SSRF via DNS rebinding | Phase 1: Backend Foundation | Integration test: submit URLs resolving to `127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`; all must return 400 |
| Cypher injection | Phase 1: Backend Foundation | Code review: zero string interpolation in any file importing `neo4j`; grep for `.format(` in driver code |
| Clerk JWT missing `azp` | Phase 1: Backend Foundation | Test: forge a JWT with wrong `azp` claim; verify 401 response |
| Neo4j driver per-request | Phase 1: Backend Foundation | Verify single `driver` instance via application startup logs; load test with 50 concurrent requests |
| GPT-4o hallucination | Phase 2: AI/Graph Generation | Spot-check 20 generated graphs against source text; hallucination rate should be <15% of entities |
| Cytoscape memory leak | Phase 3: Frontend/Visualization | Memory profiling: view 10 graphs sequentially; heap should return to within 20% of baseline |
| Missing `created_by` filter | Phase 1: Backend Foundation | Test: authenticate as User A, request User B's graph by ID; must return 403 |
| Synchronous scraping blocking event loop | Phase 1: Backend Foundation | Load test: 10 concurrent scrape requests; p99 response time for non-scrape endpoints must stay <500ms |
| No input sanitization on LLM output | Phase 2: AI/Graph Generation | Test: submit text containing `<script>alert(1)</script>` as entity name; verify it's escaped in graph output |
| CORS misconfiguration | Phase 1: Backend Foundation | Test: actual cross-origin request from Vercel preview URL to Railway backend; verify it succeeds |

## Sources

- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Clerk Manual JWT Verification Docs](https://clerk.com/docs/backend-requests/manual-jwt)
- [fastapi-clerk-auth PyPI](https://pypi.org/project/fastapi-clerk-auth/)
- [Neo4j Python Driver Performance Recommendations](https://neo4j.com/docs/python-manual/current/performance/)
- [Neo4j Driver Best Practices](https://neo4j.com/blog/developer/neo4j-driver-best-practices/)
- [Cytoscape.js Performance Documentation](https://github.com/cytoscape/cytoscape.js/blob/master/documentation/md/performance.md)
- [Cytoscape.js WebGL Renderer Preview (Jan 2025)](https://blog.js.cytoscape.org/2025/01/13/webgl-preview/)
- [Railway Database Connection Pooling](https://blog.railway.com/p/database-connection-pooling)
- [AutoGPT SSRF via DNS Rebinding Advisory (GHSA-wvjg-9879-3m7w)](https://github.com/Significant-Gravitas/AutoGPT/security/advisories/GHSA-wvjg-9879-3m7w)
- [Instructor Retry Mechanisms](https://python.useinstructor.com/learning/validation/retry_mechanisms/)
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- Existing codebase concerns: `.planning/codebase/CONCERNS.md`

---
*Pitfalls research for: GraphVC -- AI-powered crypto VC knowledge graph SaaS*
*Researched: 2026-02-25*
