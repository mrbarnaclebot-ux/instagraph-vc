# Roadmap: GraphVC

## Overview

GraphVC is built in five phases that follow the natural dependency chain of the product: secure backend first, then interactive frontend, then multi-user auth and persistence, then rate limiting and export, then public launch surface and observability. Each phase delivers a coherent, verifiable capability. The AI pipeline (the core product moat) is proven before any frontend is touched. Security vulnerabilities inherited from the Flask codebase are fixed in Phase 1 before they can be exposed to users.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Backend Foundation** - FastAPI service with VC-specific AI pipeline, SSRF-hardened scraper, and all security primitives in place (completed 2026-02-25)
- [x] **Phase 2: Monorepo + Vertical Slice** - Turborepo scaffold, Next.js BFF, and working Cytoscape UI proving the full input-to-graph flow (completed 2026-02-26)
- [x] **Phase 3: Auth + Persistence** - Clerk authentication, per-user graph ownership, Supabase metadata, and graph history (completed 2026-02-27)
- [ ] **Phase 4: Guardrails + Export** - Rate limiting with user feedback, Redis URL caching, JSON and PNG export
- [x] **Phase 5: Landing Page + Observability** - Public marketing surface, security headers, Sentry error tracking, and PostHog analytics (gap closure in progress) (completed 2026-02-26)

## Phase Details

### Phase 1: Backend Foundation
**Goal**: A working FastAPI service that accepts text or URL input, scrapes safely, extracts crypto VC entities via GPT-4o, persists graphs to Neo4j, and is free of the SSRF, Cypher injection, and JWT vulnerabilities inherited from the Flask codebase
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, SEC-01, SEC-02, SEC-03, SEC-04, AI-01, AI-02 (scraping/extraction only — Redis caching sub-requirement delivered in Phase 4 with RATE-03), AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. Developer can run `docker-compose up` and hit `POST /api/generate` with a funding announcement text, receiving a structured JSON graph with Investor, Project, Round, Narrative, and Person nodes and typed relationships
  2. Backend rejects a URL pointing to `127.0.0.1` or `10.0.0.1` with a 400 error — SSRF protection is verifiable via curl
  3. All Neo4j queries in the codebase use parameterised Cypher (`$param` syntax) — zero string interpolation; a code search for `.format(` and f-strings in files importing neo4j returns no results
  4. A request with an invalid or expired Clerk JWT is rejected with 401 before any business logic executes
  5. Backend rejects inputs shorter than 200 characters with a 400 and the message "Input too short — paste a full funding announcement or article for best results"
**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold: uv + FastAPI skeleton + Neo4j lifespan singleton + docker-compose
- [x] 01-02-PLAN.md — TDD: SSRF URL validator and input length validator (RED-GREEN-REFACTOR)
- [x] 01-03-PLAN.md — BeautifulSoup scraper (SSRF-aware) + parameterized Neo4j repository
- [x] 01-04-PLAN.md — Clerk JWT auth dependency via PyJWT + PyJWKClient
- [x] 01-05-PLAN.md — POST /api/generate endpoint: wires scraper + GPT-4o + Neo4j + auth
- [ ] 01-06-PLAN.md — Gap closure: client-side 200-char text validation + friendly 503 error handling

### Phase 2: Monorepo + Vertical Slice
**Goal**: The Turborepo monorepo is scaffolded with Next.js 15 and FastAPI co-located; a developer can submit a URL or text in the browser, watch the graph generate, and interact with a styled Cytoscape canvas — without authentication
**Depends on**: Phase 1
**Requirements**: INFRA-03, FE-01, FE-02, FE-05
**Success Criteria** (what must be TRUE):
  1. Developer runs `pnpm dev` from the repo root and both the Next.js frontend and FastAPI backend start; CI runs typecheck, lint, and test on every PR and deploys a Vercel preview
  2. User pastes a funding announcement URL into the input field, submits it, and sees an animated progress bar with "Extracting entities..." followed by an interactive Cytoscape graph where Investor nodes are indigo ellipses, Project nodes are emerald rectangles, Round nodes are amber diamonds, Narrative nodes are violet hexagons, and Person nodes are pink ellipses
  3. User clicks any node in the graph and a right-side detail panel opens showing the node label, entity type, and all extracted properties; clicking the canvas background closes the panel
  4. User submits a URL that fails to scrape and sees a toast "Couldn't read that URL — try pasting the text instead"; submitting text that produces no VC entities shows a toast "No VC relationships found"
**Plans**: 6 plans

Plans:
- [x] 02-01-PLAN.md — Turborepo monorepo scaffold: pnpm workspace, turbo.json, shared-types package, Next.js 15 skeleton with API rewrites
- [x] 02-02-PLAN.md — Cytoscape canvas (fcose, VC entity styling, neighborhood highlight) + Detail panel (key-value table, connected node nav, bottom sheet)
- [x] 02-03-PLAN.md — API client (generateGraph, GraphAPIError), LoadingSteps (cycling labels, cancel), InputCard (URL/Text tabs, hero layout, collapse)
- [x] 02-04-PLAN.md — App page wiring: state machine, dynamic GraphCanvas import, AbortController cancel, FE-05 error toasts
- [x] 02-05-PLAN.md — GitHub Actions CI/CD: ci.yml (typecheck+lint+pytest), deploy-preview.yml (Vercel), deploy-production.yml (Railway)
- [x] 02-06-PLAN.md — Human verification checkpoint: full input-to-graph flow, node interaction, error toasts, CI files

### Phase 3: Auth + Persistence
**Goal**: The application is a real multi-user product — users sign up, their graphs are saved under their identity, history is browsable, and anonymous users get one free trial before being prompted to sign up
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AI-05, FE-03
**Success Criteria** (what must be TRUE):
  1. User can sign up and sign in with email/password or Google OAuth via Clerk; visiting any `/app/*` route while signed out redirects to `/sign-in`
  2. Authenticated user generates a graph and it persists to Neo4j with their `user_id` as `created_by`; the graph appears immediately in their history at `/app/history` with title, node count, edge count, source URL, and date
  3. User can search their history by title, click a past graph to reload it on the Cytoscape canvas, and delete a graph they own; they cannot access or delete another user's graphs
  4. Anonymous user generates one graph from the landing page; on a second attempt a sign-up prompt modal appears instead of generating
  5. Every API request is logged to the Supabase `request_log` table with user_id, endpoint, source_url, IP, status code, tokens used, and timestamp
**Plans**: 6 plans

Plans:
- [x] 03-01-PLAN.md — Clerk install + proxy.ts auth guard + ClerkProvider in layout + CSP update for Clerk domains
- [ ] 03-02-PLAN.md — Supabase backend singleton (FastAPI config/lifespan/dep) + webhook Route Handler + SQL schema
- [ ] 03-03-PLAN.md — Sign-in/sign-up Clerk pages (catch-all routes) + Bearer token wiring in api.ts + app/page.tsx
- [ ] 03-04-PLAN.md — Neo4j created_by (AI-05) + service/router user_id wiring + Supabase graphs + request_log
- [ ] 03-05-PLAN.md — Graph history page (/app/history) + history API Route Handlers + anonymous trial modal
- [ ] 03-06-PLAN.md — Human verification checkpoint: full auth flow, history, trial modal

### Phase 4: Guardrails + Export
**Goal**: The application handles load safely — rate limits protect AI costs, Redis caching reduces duplicate scrapes, and users can export graphs as JSON or PNG for use in reports
**Depends on**: Phase 3
**Requirements**: RATE-01, RATE-02, RATE-03, AI-02 (Redis caching sub-requirement — caches raw scraped text in Redis for 1 hour so identical URLs skip re-scraping), EXP-01, EXP-02
**Success Criteria** (what must be TRUE):
  1. Anonymous user who has already generated one graph today receives a 429 response with a `Retry-After` header; the UI shows a toast with the retry time rather than a blank error
  2. Free authenticated user who has generated 10 graphs today sees the same 429 + toast; the daily count resets at midnight UTC
  3. Two different users who submit the same URL within one hour each see their graphs generated from the same cached scrape — only one outbound HTTP request leaves the backend for that URL
  4. User can click "Export JSON" and download a JSON file containing the current graph's nodes and edges in the standard API response format
  5. User can click "Export PNG" and receive a download link to a PNG image of the current Cytoscape canvas captured at full resolution via html-to-image
**Plans**: TBD

### Phase 5: Landing Page + Observability
**Goal**: The product has a public acquisition surface, is hardened with security headers, and is instrumented so that production errors and user funnel events are visible before any public traffic arrives
**Depends on**: Phase 4
**Requirements**: FE-04, SEC-05, OBS-01, OBS-02
**Success Criteria** (what must be TRUE):
  1. Visiting `/` shows a landing page with a hero section containing an input box for anonymous trial, an embedded animated demo graph of a sample VC relationship network, a "How it works" 3-step explainer, use case cards for Analyst, Founder, and Journalist personas, and a footer
  2. Every page response includes `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, and a Content Security Policy header covering script, style, and connect sources
  3. An uncaught exception in either the Next.js frontend or FastAPI backend appears in the Sentry dashboard within 60 seconds, tagged with user context
  4. A `graph_generated` event with `node_count`, `edge_count`, and `source_type` properties appears in PostHog after each successful graph generation; `graph_exported` events fire on JSON and PNG downloads
**Plans**: 6 plans

Plans:
- [x] 05-01-PLAN.md — Security headers (SEC-05) + Sentry frontend + Sentry FastAPI backend (OBS-01)
- [x] 05-02-PLAN.md — PostHog provider, analytics helpers, graph_generated event (OBS-02)
- [x] 05-03-PLAN.md — Landing page foundation: DemoGraph canvas, LandingNav, HeroSection (FE-04)
- [x] 05-04-PLAN.md — Landing page completion: HowItWorks, PersonaCards, CtaBand, Footer, page assembly + verification (FE-04)
- [ ] 05-05-PLAN.md — Gap closure: PostHog conditional init guard in providers.tsx (OBS-02)
- [ ] 05-06-PLAN.md — Gap closure: HeroSection graph render — VCGraph state + dynamic GraphCanvas replacing DemoGraph on success (FE-04)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation | 5/6 | Gap closure planned | 2026-02-25 |
| 2. Monorepo + Vertical Slice | 6/6 | Complete    | 2026-02-26 |
| 3. Auth + Persistence | 6/6 | Complete   | 2026-02-27 |
| 4. Guardrails + Export | 0/TBD | Not started | - |
| 5. Landing Page + Observability | 6/6 | Complete   | 2026-02-26 |

---
*Roadmap created: 2026-02-25*
*Coverage: 27/27 v1 requirements mapped*
*Phase 1 planned: 2026-02-25 — 5 plans across 3 waves + 1 gap closure plan (Wave 1)*
*Phase 3 planned: 2026-02-27 — 6 plans across 4 waves*
*Phase 5 planned: 2026-02-26 — 4 plans across 2 waves + 2 gap closure plans (Wave 1)*
*AI-02 note: scraping/extraction sub-requirement in Phase 1 (plan 01-03); Redis caching sub-requirement in Phase 4 (with RATE-03)*
