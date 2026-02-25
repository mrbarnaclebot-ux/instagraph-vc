# Requirements: GraphVC

**Defined:** 2026-02-25
**Core Value:** Users can instantly generate and explore accurate visual maps of crypto VC relationships from any public funding announcement — without spreadsheets, manual research, or expensive tools.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Developer can scaffold monorepo with `apps/web/` (Next.js 15) and `apps/api/` (FastAPI) sharing a `packages/shared-types/` TypeScript package via Turborepo
- [x] **INFRA-02**: Developer can run full stack locally with `docker-compose up` starting Neo4j and Redis; frontend and backend connect to local services via `.env.local`
- [ ] **INFRA-03**: CI/CD pipeline runs `typecheck`, `lint`, and `test` on every PR; deploys frontend to Vercel preview on PR and to production on merge to main; deploys backend to Railway on merge to main

### Security

- [x] **SEC-01**: Backend validates every inbound URL against private IP ranges (RFC 1918, loopback, link-local), enforces HTTPS-only scheme, and rejects blocked domains before making any outbound HTTP request
- [ ] **SEC-02**: All Neo4j database queries use parameterised Cypher (driver parameter objects) — zero string interpolation into query strings anywhere in the codebase
- [x] **SEC-03**: Every FastAPI protected endpoint validates the Clerk JWT Bearer token — verifying signature via Clerk JWKS, `azp` claim, and expiry — before executing any business logic
- [x] **SEC-04**: FastAPI initialises a single Neo4j driver instance at startup (singleton), reuses it across requests, and closes it gracefully on shutdown — no per-request driver instantiation
- [ ] **SEC-05**: Next.js middleware sets security headers on every response: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, and a Content Security Policy that covers script/style/connect sources

### AI & Graph Generation

- [ ] **AI-01**: Backend generates a structured knowledge graph from input using GPT-4o with the VC-specific system prompt — extracting Investor, Project, Round, Narrative, and Person entities with their typed relationships (LED, INVESTED_IN, CO_INVESTED, RAISED, FOUNDED, PARTNERS_AT, FOCUSES_ON, CLASSIFIED_AS) and entity properties (AUM, token ticker, chain, raise amounts, stage focus)
- [ ] **AI-02**: Backend scrapes a public HTTPS URL, strips boilerplate HTML via BeautifulSoup, caps content at 32,000 characters before sending to GPT-4o, and caches the raw scraped text in Redis for 1 hour so identical URLs skip re-scraping
- [ ] **AI-03**: User can paste raw text (funding announcement, article excerpt) directly into the input field as an alternative to URL input — bypasses scraping, goes straight to GPT-4o
- [x] **AI-04**: Backend rejects inputs shorter than 200 characters with a `400` error and user-facing message "Input too short — paste a full funding announcement or article for best results"
- [ ] **AI-05**: Generated graph nodes and edges are persisted to Neo4j Aura with `created_by: user_id` ownership field and timestamps; anonymous graphs use `created_by: "anonymous"`

### Frontend

- [ ] **FE-01**: Authenticated user sees a dashboard at `/app` with a Cytoscape.js graph canvas using VC entity styling: Investor=indigo ellipse, Project=emerald rectangle, Round=amber diamond, Narrative=violet hexagon, Person=pink ellipse; edge styles differ by relationship type; canvas uses performance-optimised Cytoscape config (haystack/bezier edges, `data()` style mappers, `pixelRatio: 1`, `hideEdgesOnViewport: true`)
- [ ] **FE-02**: User can click any node in the graph to open a right-side detail panel showing the node's label, entity type, and all extracted properties (e.g., AUM, stage focus, token ticker); clicking the canvas background closes the panel
- [ ] **FE-03**: Authenticated user can view their graph history at `/app/history` showing a list of past graphs (title, node count, edge count, source URL, date); can search by title, click to reload a graph, and delete a graph they own
- [ ] **FE-04**: Landing page at `/` has: hero section with input box (anonymous try), embedded animated demo graph showing a sample VC relationship, "How it works" 3-step explainer, use case cards (Analyst / Founder / Journalist), and a footer
- [ ] **FE-05**: User sees appropriate UI for each state: animated progress bar + "Extracting entities..." during generation; toast "Couldn't read that URL — try pasting the text instead" on scrape failure; toast "No VC relationships found" on empty graph; toast with retry button on API error

### Authentication & Users

- [ ] **AUTH-01**: User can sign up and sign in via Clerk with email/password or Google OAuth; all `/app/*` routes redirect unauthenticated users to `/sign-in`; Clerk JWT is sent as `Authorization: Bearer` header on all API calls
- [ ] **AUTH-02**: Anonymous user can generate one graph from the landing page hero input without signing in — result is stored in `localStorage`; on second generation attempt, user sees a sign-up prompt modal
- [ ] **AUTH-03**: Supabase contains a `users` table (id, email, plan, created_at) synced via Clerk `user.created` webhook, and a `graphs` table (id, user_id, title, source_url, node_count, edge_count, neo4j_session_id, created_at) updated on every graph save
- [ ] **AUTH-04**: Every API request is logged to a Supabase `request_log` table with user_id, endpoint, source_url, IP address, status code, tokens used, and timestamp

### Rate Limiting

- [ ] **RATE-01**: FastAPI enforces per-user daily limits via Upstash Redis sliding window: anonymous users=1 graph/day, free users=10 graphs/day; exceeding the limit returns `429` with `Retry-After` header and `{ "error": "rate_limited", "retry_after": N, "message": "Daily limit reached" }`
- [ ] **RATE-02**: Vercel Edge middleware enforces 60 requests/minute per IP across all routes — returning `429` for IPs that exceed the threshold (brute force protection)
- [ ] **RATE-03**: Scraped URL content is cached in Upstash Redis for 1 hour (key: hash of normalised URL) so that multiple users requesting the same URL trigger only one outbound scrape

### Export

- [ ] **EXP-01**: User can click "Export JSON" to download the current graph's nodes and edges as a JSON file in the standard response format (same shape as `POST /api/generate` response)
- [ ] **EXP-02**: User can click "Export PNG" to capture the current Cytoscape canvas as a PNG image via `html-to-image`; the image is uploaded to Vercel Blob and a download link is returned to the user

### Observability

- [ ] **OBS-01**: Sentry is configured on both the Next.js frontend and FastAPI backend; uncaught exceptions and API errors (5xx) are captured with user context; alert fires when error rate exceeds 1% in a 5-minute window
- [ ] **OBS-02**: PostHog is configured on the frontend and tracks `graph_generated` (with node_count, edge_count, source_type), `graph_exported` (with format), and `graph_history_viewed` events
- [ ] **OBS-03**: (Covered by SEC-05 — security headers include CSP)

---

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Growth & Collaboration

- **GROW-01**: Graph sharing via public link (shareable read-only view without auth)
- **GROW-02**: Email waitlist → invite flow for controlled rollout
- **GROW-03**: Admin dashboard with usage metrics (graphs/day, active users, top sources)
- **GROW-04**: User feedback widget (thumbs up/down on graph quality)

### Power Features

- **FEAT-01**: Graph expand mode — double-click a node to fetch and overlay related nodes from Neo4j
- **FEAT-02**: Graph merge — paste a second URL to add nodes/edges to an existing graph
- **FEAT-03**: Graph deduplication — cross-session entity matching (e.g., "Paradigm" appears once globally)
- **FEAT-04**: Graph search — full-text search across all a user's graphs by title and entity names

### Platform

- **PLAT-01**: Pro tier billing (Stripe) with higher rate limits (100 graphs/day)
- **PLAT-02**: Background job queue (Upstash QStash) for inputs >16k chars — async with job polling
- **PLAT-03**: 2FA support via Clerk

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time data feeds (Crunchbase API, Nansen) | Requires paid data partnerships; v2+ |
| Wallet tracking / on-chain data | Separate data pipeline; different product surface |
| Team collaboration / shared workspaces | Complex permissions model; not validated with users yet |
| Mobile app | Web-first; responsive layout is sufficient for MVP personas |
| Cypher query UI | Power user feature; not needed for analyst/founder/journalist personas |
| Twitter/LinkedIn scraping | Blocked — legal/ToS risk |
| Social login beyond Google | Clerk supports it but no user demand signal yet |
| Graph database querying outside of app | No ops tooling needed for MVP |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status | Note |
|-------------|-------|--------|------|
| INFRA-01 | Phase 1 | Complete | |
| INFRA-02 | Phase 1 | Complete | |
| INFRA-03 | Phase 2 | Pending | |
| SEC-01 | Phase 1 | Complete | |
| SEC-02 | Phase 1 | Pending | |
| SEC-03 | Phase 1 | Complete | |
| SEC-04 | Phase 1 | Complete | |
| SEC-05 | Phase 5 | Pending | |
| AI-01 | Phase 1 | Pending | |
| AI-02 (scraping/extraction) | Phase 1 | Pending | Plan 01-03: scrape URL, strip HTML, cap at 32k chars |
| AI-02 (Redis caching) | Phase 4 | Pending | With RATE-03: cache scraped text in Redis for 1 hour |
| AI-03 | Phase 1 | Pending | |
| AI-04 | Phase 1 | Complete | |
| AI-05 | Phase 3 | Pending | |
| FE-01 | Phase 2 | Pending | |
| FE-02 | Phase 2 | Pending | |
| FE-03 | Phase 3 | Pending | |
| FE-04 | Phase 5 | Pending | |
| FE-05 | Phase 2 | Pending | |
| AUTH-01 | Phase 3 | Pending | |
| AUTH-02 | Phase 3 | Pending | |
| AUTH-03 | Phase 3 | Pending | |
| AUTH-04 | Phase 3 | Pending | |
| RATE-01 | Phase 4 | Pending | |
| RATE-02 | Phase 4 | Pending | |
| RATE-03 | Phase 4 | Pending | |
| EXP-01 | Phase 4 | Pending | |
| EXP-02 | Phase 4 | Pending | |
| OBS-01 | Phase 5 | Pending | |
| OBS-02 | Phase 5 | Pending | |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓
- AI-02 split across Phase 1 (scraping) and Phase 4 (Redis caching) — both sub-requirements tracked

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 — traceability updated after roadmap creation*
*2026-02-25 — AI-02 traceability split: scraping/extraction (Phase 1, plan 01-03) vs Redis caching (Phase 4, with RATE-03)*
