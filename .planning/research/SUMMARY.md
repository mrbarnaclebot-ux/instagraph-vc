# Project Research Summary

**Project:** GraphVC (Crypto VC Intelligence Platform)
**Domain:** AI-powered crypto VC knowledge graph SaaS
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH

## Executive Summary

GraphVC is an AI-powered knowledge graph tool that extracts crypto VC relationships (investors, projects, funding rounds, narratives, people) from public URLs and unstructured text, then renders them as interactive explorable graphs. The recommended build approach is a Turborepo monorepo with Next.js 15 (App Router) on Vercel as a BFF frontend, and FastAPI on Railway as the persistent AI/graph backend. This split exists because Vercel's serverless timeout limits (10-60s) make it incompatible with OpenAI calls plus scraping plus Neo4j writes in a single function — Railway persistent containers solve this. The existing InstaGraph Flask codebase provides a proven AI pipeline (instructor + GPT-4o + BeautifulSoup + Cytoscape.js) that simply needs porting to FastAPI async patterns, not a ground-up rewrite.

The product occupies a defensible niche: no existing tool (Arkham, Bubblemaps, Messari, Nansen, Crunchbase) lets a user paste a funding announcement URL and instantly see a visual graph of who invested alongside whom, what else those VCs funded, and what narratives connect the portfolio. The core moat is the VC-specific entity schema (with properties like AUM, stage focus, token ticker, raise amounts) and the relationship vocabulary (LED, INVESTED_IN, CO_INVESTED, RAISED, FOUNDED) that maps to how crypto VCs actually think about deal flow. Generic graph tools do not offer this.

The top risks are security-first: SSRF via DNS rebinding in the URL scraper and Cypher injection from the existing Flask codebase's string-interpolated queries are both HIGH severity and must be fixed before any production deployment. GPT-4o hallucination of VC entities is the product quality risk — ~23% hallucination rate without mitigation, manageable with source_snippet validation and confidence thresholds. These three risks should dominate Phase 1 scope decisions.

## Key Findings

### Recommended Stack

The stack is a well-integrated set of managed services that minimize infrastructure operations while staying on proven, version-stable libraries. Next.js 15 (not 14 as specified in PROJECT.md, not 16 which is too new) is the correct frontend choice — it ships with React 19, Turbopack, and async `auth()` support from `@clerk/nextjs` v6. The FastAPI backend uses the existing instructor + GPT-4o pattern (already proven in InstaGraph) ported to Python 3.12 with async throughout. Neo4j driver must be pinned to v5.28.3, not v6.x, due to breaking changes in v6 and unsettled ecosystem compatibility.

The infrastructure is entirely managed/serverless: Vercel (frontend), Railway (FastAPI persistent container), Neo4j Aura (graph database), Supabase (relational metadata), Upstash Redis (rate limiting + URL cache), Clerk (authentication). All start on free tiers and scale to paid plans at defined thresholds. The key architecture insight: Supabase handles all tabular metadata (user list, graph index, audit logs) while Neo4j handles only graph topology — mixing them would waste Neo4j node quota and make simple list queries awkward.

**Core technologies:**
- Next.js 15 + React 19: Frontend framework — App Router mature, Turbopack stable, async auth() from Clerk v6
- FastAPI 0.133+ on Python 3.12: Backend framework — async-native, auto-OpenAPI docs, Pydantic v2 native
- Cytoscape.js 3.30+ with react-cytoscapejs: Graph visualization — existing codebase foundation, purpose-built for graph networks
- instructor 1.14.5 + GPT-4o: Structured LLM extraction — existing proven pattern, Pydantic v2 + async
- neo4j 5.28.3 (v5, not v6): Graph database driver — async, forward-compatible with Neo4j Aura 2025.x
- Clerk + @clerk/nextjs v6: Authentication — email + Google OAuth, JWT, App Router compatible
- Upstash Redis + @upstash/ratelimit: Rate limiting + caching — HTTP-based, serverless-native, Edge-compatible
- Turborepo + pnpm workspaces: Monorepo tooling — parallel builds, caching, native Vercel integration
- Supabase: Relational metadata store — user profiles, graph index, audit logs (not Neo4j)

### Expected Features

The feature research identifies a clear MVP scope and defers complex features explicitly. The anonymous 1-graph trial (paste URL, get value, then sign up) is the primary acquisition mechanic and differentiator from competing tools that gate behind registration. Graph persistence and history is the primary retention hook.

**Must have (table stakes):**
- Text + URL input for graph generation — core value prop, already exists in InstaGraph
- Interactive Cytoscape canvas (pan, zoom, drag) — every graph tool has this, Cytoscape provides it
- Node click to reveal detail sidebar — "detail on demand", the foundational graph UX pattern
- Entity type visual differentiation (color + shape by type) — makes semantics readable at a glance
- Edge labels showing relationship type — without these, the graph is meaningless
- Authentication with Google OAuth — Clerk handles this minimally
- Graph history / saved graphs — without persistence, every session starts from zero
- Graph export (PNG, JSON) — analysts need to share findings in reports
- Rate limiting with clear user feedback — prevents AI cost spiraling
- Loading states and error handling — AI calls take 5-15s; users assume broken without feedback

**Should have (competitive differentiators):**
- Crypto VC-specific entity extraction (Investor, Project, Round, Narrative, Person with VC properties) — the core moat
- VC relationship vocabulary (LED, INVESTED_IN, CO_INVESTED, etc.) — how VCs think about deal flow
- Anonymous 1-graph trial without registration — reduces acquisition friction dramatically
- URL content caching (Redis, 1hr TTL) — reduces latency for popular articles shared by multiple users
- Graph legend overlay — enables standalone screenshot sharing
- Node hover to highlight connected edges — power exploration UX

**Defer (v2+):**
- Node double-click to expand sub-graph — HIGH complexity, requires Neo4j sub-graph queries + graph merging
- Right-click context menu — useful but not launch-blocking
- Graph merging / entity deduplication — hard entity resolution problem, creates data quality risk if done wrong
- Real-time data feeds (Crunchbase, Nansen API) — requires paid partnerships, premature before PMF
- Paid tier / billing integration — add only after 100+ users express willingness to pay
- Team collaboration / shared graphs — multi-user is its own product; use export for sharing initially
- WebGL renderer for Cytoscape — monitor stability, canvas renderer adequate for MVP graph sizes (10-80 nodes)

### Architecture Approach

The architecture is a BFF (Backend-for-Frontend) split where Next.js owns all browser-facing surfaces and acts as a thin authenticated proxy to FastAPI for heavy operations. FastAPI is never exposed to the browser directly — all client traffic hits Next.js route handlers, which validate Clerk JWTs, check Upstash rate limits, then forward requests with an internal API key plus the extracted user ID. FastAPI trusts the internal key rather than handling JWT validation itself. Server Components fetch metadata from Supabase directly (no FastAPI round-trip for reads); Client Components handle all Cytoscape rendering (DOM-required). The key pattern across every page: Server Component fetches metadata server-side, mounts a Client Component that loads graph data client-side.

**Major components:**
1. Next.js App (Vercel) — SSR pages, Clerk auth middleware, BFF route handlers, Cytoscape client-side rendering, html-to-image export
2. FastAPI backend (Railway) — graph generation orchestration, OpenAI/instructor calls, BeautifulSoup URL scraping, Neo4j graph persistence, Supabase metadata writes
3. Neo4j Aura — graph topology storage (nodes + edges + per-user ownership); never used for tabular metadata
4. Supabase — relational metadata (users table, graphs index, audit logs); direct-read by Server Components
5. Upstash Redis — sliding-window rate limiting in Next.js middleware + URL content caching in FastAPI (1hr TTL)
6. Clerk — authentication, JWT issuance, user.created webhook to Supabase for user sync

### Critical Pitfalls

1. **SSRF via DNS rebinding in URL scraper** — The naive pattern (validate IP with `socket.getaddrinfo()`, then pass original URL to `requests.get()`) is vulnerable because DNS can change between the two calls. Fix: resolve DNS once, connect to the resolved IP directly, block all private/reserved ranges (127.0.0.0/8, 10.0.0.0/8, 169.254.0.0/16, etc.), disable redirects, restrict to http/https only. This is a Phase 1 non-negotiable.

2. **Cypher injection via string interpolation** — The existing Flask codebase uses `.format()` for Cypher parameters (documented in CONCERNS.md). Parameterized queries (`$param` syntax) must replace all string interpolation during the Flask-to-FastAPI port. Zero tolerance: no `.format()`, f-strings, or `%s` in any file importing neo4j.

3. **Clerk JWT missing `azp` claim check** — Most JWT tutorials only validate `exp` and signature. The `azp` (authorized party) claim is Clerk-specific and prevents cross-app token replay attacks. Use `fastapi-clerk-auth` which handles this, or explicitly validate `azp` against your frontend origin in manual PyJWT code.

4. **Neo4j driver created per-request** — Neo4j Aura Free has 100 concurrent connection limit. Creating a new driver instance per FastAPI request exhausts this quickly. The fix is a single `AsyncGraphDatabase.driver()` instance created in FastAPI's lifespan handler, shared via dependency injection.

5. **GPT-4o hallucinating VC entities** — Structured output (instructor/Pydantic) forces the model to produce entities even when uncertain, yielding fabricated investor names, wrong funding amounts, invented co-investment relationships. Mitigation: optional Pydantic fields with `confidence: float` + `source_snippet: str`, post-processing that rejects entities where source_snippet doesn't appear in input text, instructor `max_retries=3` with validation.

## Implications for Roadmap

Based on combined research, the architecture's suggested build order from ARCHITECTURE.md aligns well with the pitfall-to-phase mapping from PITFALLS.md. The dependency chain is clear: the monorepo scaffold must come first, then the backend AI pipeline (since it's the core logic), then the BFF + basic UI (to prove the vertical slice), then auth + persistence, then guardrails, then polish.

### Phase 1: Backend Foundation

**Rationale:** The AI pipeline is the core product logic and the source of the most critical security vulnerabilities (SSRF, Cypher injection, auth). Port the existing Flask code to FastAPI async before building any frontend — this validates the proven logic works in the new framework and forces the security fixes early. All 5 critical pitfalls except Cytoscape memory leaks belong in this phase.

**Delivers:** Working FastAPI service that accepts text/URL input, scrapes safely, extracts VC entities via GPT-4o + instructor, persists to Neo4j, returns structured graph data. Verifiable via curl/httpie without any frontend.

**Addresses:**
- Graph generation from text/URL (core table stakes feature)
- URL content caching in Redis
- VC-specific entity extraction (the product's core moat)
- Clerk JWT validation with `azp` check
- Rate limiting middleware

**Avoids:**
- SSRF via DNS rebinding (SSRF protection baked into scraper from day one)
- Cypher injection (all queries parameterized during Flask port)
- Clerk JWT missing `azp` (fastapi-clerk-auth or manual `azp` check)
- Neo4j driver per-request (single lifespan driver instance)

**Stack elements:** FastAPI 0.133+, Python 3.12, instructor 1.14.5, openai 2.21+, neo4j 5.28.3, httpx (async HTTP), beautifulsoup4, supabase Python client, fastapi-clerk-auth

### Phase 2: Monorepo Scaffold + BFF + Vertical Slice

**Rationale:** With the backend proven, set up the Turborepo monorepo and Next.js App Router BFF layer. Build the minimum frontend (input form + Cytoscape canvas) to prove the full vertical slice (user submits URL -> sees interactive graph). No auth yet — use a hardcoded user ID to test the flow end-to-end.

**Delivers:** Full working vertical slice: text/URL input form, BFF route handler that proxies to FastAPI, Cytoscape canvas rendering the returned graph with VC-specific styling. Functional locally without authentication.

**Addresses:**
- Interactive Cytoscape canvas with performance optimizations (fcose layout, data() mappers, bezier edges)
- Entity type visual differentiation (Investor=indigo, Project=emerald, Round=amber, etc.)
- Edge labels for relationship types
- BFF proxy pattern (Next.js route handlers validate, forward to FastAPI with internal API key)
- Server Component / Client Component split established

**Avoids:**
- Direct FastAPI exposure to browser (BFF pattern enforced from start)
- Neo4j driver per-request (already addressed in Phase 1)
- Cytoscape canvas memory leak (single instance recycling via cy.elements().remove() + cy.add())

**Stack elements:** Next.js 15, Turborepo + pnpm, react-cytoscapejs, cytoscape, Tailwind CSS 4.x

### Phase 3: Authentication + Persistence

**Rationale:** Auth is a cross-cutting concern best added after the core flow is proven. Add Clerk middleware, protected routes, user sync webhook to Supabase, and wire up per-user graph ownership. This phase converts the prototype into a real multi-user product.

**Delivers:** User sign-up/sign-in with Google OAuth, protected `/app/*` routes, per-user graph persistence in Neo4j + graph index in Supabase, graph history page, individual graph page with persistent URL.

**Addresses:**
- Authentication with social login (Clerk, Google OAuth)
- Graph history / saved graphs (retention hook)
- Anonymous 1-graph trial (localStorage for anon graph, Clerk prompt on second attempt)
- Graph ownership validation (every Neo4j query includes `WHERE g.created_by = $user_id`)

**Avoids:**
- Missing `created_by` filter on graph read/delete (test: User A cannot access User B's graphs)
- Storing raw scraped HTML in database (store extracted text only)

**Stack elements:** @clerk/nextjs v6, Clerk webhooks, Supabase JS client, Supabase row-level security

### Phase 4: Guardrails + Polish

**Rationale:** Before any public launch, add rate limiting with clear UX feedback, URL caching for performance, and the export features that enable sharing. Also address the UX pitfalls (progress feedback during 15s generation, empty states, navigation controls).

**Delivers:** Rate limiting with 429 + Retry-After headers and visible UI feedback, Redis URL caching in FastAPI, PNG export via html-to-image, JSON export, loading progress states ("Scraping URL...", "Extracting entities...", "Building graph..."), node detail sidebar, graph legend overlay, fit-to-viewport control.

**Addresses:**
- Rate limiting with clear feedback (Upstash sliding window, both anonymous and authenticated paths)
- Graph export PNG + JSON
- Node click to reveal detail panel
- Graph legend overlay
- Loading states and error handling
- Fit-to-viewport button

**Avoids:**
- No progress feedback causing user abandonment (stream status updates)
- Rate limiting not distinguishing anon vs authenticated (both paths tested)
- Graph export missing high-DPI handling (Retina display test)

**Stack elements:** @upstash/redis, @upstash/ratelimit, html-to-image, Vercel Blob

### Phase 5: Landing Page + Observability

**Rationale:** Pre-launch marketing surface and production monitoring. The landing page with embedded demo graph is the primary acquisition surface. Sentry + PostHog enable error monitoring and funnel analysis before scaling traffic.

**Delivers:** Public landing page with hero, embedded read-only demo graph, value proposition copy, sign-up CTA. Sentry error monitoring for both Next.js and FastAPI. PostHog event tracking for acquisition funnel (landing -> trial graph -> sign-up -> saved graph).

**Addresses:**
- Landing page with demo graph (table stakes for SaaS acquisition)
- Mobile-responsive layout for landing page
- Observability for production operations

**Avoids:**
- Sentry `traces_sample_rate=1.0` in production (set to 0.1 — 10%)
- No structured error format (all 4xx/5xx return `{"error": "message", "code": "ERROR_CODE"}`)

**Stack elements:** Sentry (Next.js + FastAPI SDK), PostHog, Vercel Blob (demo graph storage)

### Phase Ordering Rationale

- Backend before frontend because the AI pipeline is the most complex and most vulnerable component; proving it works before building UI surfaces avoids discovering fundamental issues late.
- Vertical slice before auth because auth adds noise to debugging the core flow; test with hardcoded user ID until graph generation and rendering are solid.
- Auth before guardrails because rate limiting requires user identity (authenticated vs anonymous limits are different); building guardrails without auth means rebuilding them.
- Guardrails + polish before landing page because there is no point marketing a product that doesn't handle load or have export features that analysts need.
- The ARCHITECTURE.md suggested build order (monorepo -> backend -> BFF+UI -> auth -> rate limiting -> polish -> observability) is validated by this synthesis and is the correct sequence.

### Research Flags

Phases needing deeper research during planning:

- **Phase 1 (Backend Foundation):** SSRF protection implementation details (DNS rebinding prevention, IPv6-mapped addresses, redirect chain validation) warrant a focused research pass. The existing codebase has the vulnerability, and the fix has nuanced edge cases. Recommend `/gsd:research-phase` before implementing the scraper.
- **Phase 3 (Auth + Persistence):** Clerk webhook + Supabase user sync is well-documented by Clerk but has edge cases (webhook replay, Supabase RLS policy setup for Clerk JWTs). A targeted research pass on the exact Supabase RLS configuration for Clerk is recommended.
- **Phase 4 (Guardrails):** The Upstash + Clerk + Next.js middleware pattern is well-documented and can be implemented directly from STACK.md examples. No additional research needed.

Phases with standard patterns (skip research-phase):

- **Phase 2 (Monorepo + Vertical Slice):** Turborepo + Next.js 15 + FastAPI monorepo setup is well-documented. The `next-fast-turbo` reference repo provides a working example. ARCHITECTURE.md includes full directory structure and config.
- **Phase 5 (Landing Page + Observability):** Sentry and PostHog have standard Next.js + FastAPI integration patterns. Landing page is standard marketing page work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified via official PyPI, npm, and framework documentation. Version recommendations (Next.js 15, neo4j v5 not v6) are explicitly sourced. One MEDIUM exception: `fastapi-clerk-auth` is v0.0.9, a small library — keep manual PyJWT fallback pattern documented. |
| Features | MEDIUM-HIGH | Table stakes features are grounded in competitive analysis (Arkham, Bubblemaps, Messari, Nansen) and established graph visualization UX research (Cambridge Intelligence, Stanford CS520). Cytoscape.js performance patterns are from official docs. Competitive landscape analysis is MEDIUM (sources are blog posts and product pages, not primary user research). |
| Architecture | HIGH | BFF pattern, Server/Client Component split, and Neo4j lifespan driver are directly from official Next.js and Neo4j documentation. Turborepo configuration sourced from official Turborepo docs and verified reference repos. Anti-patterns are based on official documentation warnings. |
| Pitfalls | HIGH | Critical pitfalls are sourced from OWASP (SSRF), Neo4j official driver manual (connection pooling), Clerk official docs (azp claim), and CVE/GitHub security advisories (DNS rebinding). The hallucination rate (~23%) is a research claim — treat as directional, not precise. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **`fastapi-clerk-auth` library stability:** v0.0.9 is a small, low-activity library. If it shows any sign of abandonment or incompatibility with Clerk API changes, fall back to the manual PyJWT + `PyJWKClient` pattern documented in STACK.md. Monitor during Phase 1 implementation.
- **Neo4j Aura Free cold start:** Aura Free pauses after 3 days of inactivity; first request after pause takes 30-60 seconds. During development this is acceptable. Before launch, implement a keep-alive cron (Vercel Cron or Railway cron) or upgrade to Aura Pro. Not a Phase 1 blocker but needs a decision before Phase 5 (launch).
- **GPT-4o hallucination rate validation:** The 23% figure cited in PITFALLS.md is from research on general LLM hallucination; the actual rate for crypto VC entity extraction with the specific system prompt and source_snippet mitigation needs empirical measurement during Phase 2. Build the measurement tooling (spot-check logging) alongside the extraction pipeline.
- **Railway timeout limits:** ARCHITECTURE.md assumes Railway persistent containers handle long-running requests. Verify Railway's request timeout defaults (Railway Pro has no timeout limit; Hobby tier has a 30s limit per request). Graph generation can exceed 30s for large inputs. This may force Railway Pro tier earlier than expected.
- **Clerk anonymous trial implementation:** Anonymous 1-graph trial via localStorage is the planned pattern, but the exact integration between localStorage state and Clerk's sign-up prompt needs implementation validation. Not a risk, but not fully specified in research.

## Sources

### Primary (HIGH confidence)
- [Next.js 15 Release Blog](https://nextjs.org/blog/next-15) — framework version decision
- [Next.js App Router Docs](https://nextjs.org/docs/app) — BFF patterns, Server/Client Component split
- [Next.js BFF Guide (Official, 2026-02-20)](https://nextjs.org/docs/app/guides/backend-for-frontend) — BFF architecture pattern
- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) — auth integration
- [@clerk/nextjs v6 Changelog](https://clerk.com/changelog/2024-10-22-clerk-nextjs-v6) — async auth(), static rendering compatibility
- [Clerk Manual JWT Verification](https://clerk.com/docs/backend-requests/manual-jwt) — azp claim requirement
- [Clerk + Supabase User Sync (Official Clerk Blog)](https://clerk.com/blog/sync-clerk-user-data-to-supabase) — user sync pattern
- [Neo4j Python Driver Manual — Async API](https://neo4j.com/docs/api/python-driver/current/async_api.html) — driver lifecycle
- [Neo4j Driver Best Practices](https://neo4j.com/blog/developer/neo4j-driver-best-practices/) — connection pooling
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) — SSRF prevention
- [Cytoscape.js Performance Documentation](https://github.com/cytoscape/cytoscape.js/blob/master/documentation/md/performance.md) — optimization patterns
- [Cytoscape.js WebGL Renderer Preview (Jan 2025)](https://blog.js.cytoscape.org/2025/01/13/webgl-preview/) — WebGL renderer status
- [FastAPI on PyPI](https://pypi.org/project/fastapi/) — version confirmation
- [OpenAI Python SDK on PyPI](https://pypi.org/project/openai/) — v2.21.0 confirmation
- [Instructor on PyPI](https://pypi.org/project/instructor/) — v1.14.5 confirmation
- [Neo4j on PyPI](https://pypi.org/project/neo4j/) — v5.28.3 / v6.1.0 confirmation
- [@upstash/ratelimit on npm](https://www.npmjs.com/package/@upstash/ratelimit) — v2.0.8 confirmation
- [Turborepo Next.js Guide (Official)](https://turborepo.dev/docs/guides/frameworks/nextjs) — monorepo setup

### Secondary (MEDIUM confidence)
- [Cytoscape.js Performance Optimization (DeepWiki)](https://deepwiki.com/cytoscape/cytoscape.js/8-performance-optimization) — layout algorithm comparison
- [Knowledge Graph Visualization Best Practices (Cambridge Intelligence)](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/) — UX interaction patterns
- [Stanford CS520: How Do Users Interact With Knowledge Graphs](https://web.stanford.edu/class/cs520/2020/notes/How_Do_Users_Interact_With_a_Knowledge_Graph.html) — detail-on-demand pattern
- [Generating API clients in monorepos with FastAPI & Next.js (Vinta Software)](https://www.vintasoftware.com/blog/nextjs-fastapi-monorepo) — monorepo reference
- [next-fast-turbo reference repo](https://github.com/cording12/next-fast-turbo) — Turborepo + Next.js + FastAPI reference
- [fastapi-clerk-auth on PyPI](https://pypi.org/project/fastapi-clerk-auth/) — v0.0.9, small library
- [AutoGPT SSRF via DNS Rebinding Advisory](https://github.com/Significant-Gravitas/AutoGPT/security/advisories/GHSA-wvjg-9879-3m7w) — DNS rebinding pattern
- [Arkham Intelligence Visualizer](https://codex.arkm.com/the-intelligence-platform/visualizer) — competitive reference
- [Top Crypto Analytics Platforms (Nansen)](https://www.nansen.ai/post/top-crypto-analytics-platforms-used-by-vcs-for-strategic-insights-due-diligence) — competitive landscape

### Tertiary (LOW confidence)
- [Large Network Graph Rendering Methods (Medium)](https://weber-stephen.medium.com/the-best-libraries-and-methods-to-render-large-network-graphs-on-the-web-d122ece2f4dc) — library comparison, needs validation
- Existing codebase: `.planning/codebase/CONCERNS.md` — Cypher injection vulnerability documentation

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
