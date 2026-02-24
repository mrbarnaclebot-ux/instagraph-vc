# GraphVC

## What This Is

GraphVC is a crypto-native VC intelligence platform that automatically maps relationships between investors, portfolio companies, funding rounds, and market narratives using AI-powered knowledge graph generation. Users paste a URL (funding announcement, VC portfolio page, news article) or free-form text, and GraphVC returns an interactive, explorable relationship graph that persists and grows into a queryable intelligence layer. It is built on a fork of the open-source InstaGraph project, transformed into a production-grade Next.js + FastAPI application with crypto VC-specific prompting, Clerk authentication, and cloud-hosted Neo4j graph storage.

**Target users:** Crypto analysts mapping co-investment patterns, founders researching investor warm paths, journalists visualizing funding syndicates.

## Core Value

Users can instantly generate and explore accurate visual maps of crypto VC relationships from any public funding announcement — without spreadsheets, manual research, or expensive tools.

## Requirements

### Validated

<!-- Capabilities confirmed working in the existing InstaGraph codebase -->

- ✓ Knowledge graph generation from text/URL input via OpenAI + instructor — existing
- ✓ URL scraping with BeautifulSoup to extract text content — existing
- ✓ Cytoscape.js interactive graph visualization (pan, zoom, layout) — existing
- ✓ Neo4j driver for graph database persistence and history retrieval — existing
- ✓ Pydantic data models defining Node, Edge, KnowledgeGraph schema — existing
- ✓ Graph history retrieval with pagination — existing
- ✓ Graphviz PNG export — existing (will be replaced with html-to-image)

### Active

<!-- New capabilities for the GraphVC MVP -->

**Infrastructure & Architecture**
- [ ] Restructure repository into monorepo: `apps/web/` (Next.js) + `apps/api/` (FastAPI)
- [ ] Rewrite backend from Flask to FastAPI with async support
- [ ] Deploy frontend to Vercel, backend to Railway

**Authentication & Users**
- [ ] Clerk authentication with email/password and Google OAuth
- [ ] Anonymous users can generate 1 graph (stored in localStorage); prompted to sign up on 2nd attempt
- [ ] Supabase schema: `users` table synced via Clerk webhook, `graphs` metadata table, `request_log` audit table
- [ ] Sessions persist across logins for authenticated users

**AI — Crypto VC Intelligence**
- [ ] Upgrade AI model from GPT-3.5-turbo to GPT-4o
- [ ] VC-specific system prompt: extracts Investor, Project, Round, Narrative, Person entities
- [ ] VC-specific relationships: LED, INVESTED_IN, CO_INVESTED, RAISED, FOUNDED, PARTNERS_AT, FOCUSES_ON, CLASSIFIED_AS
- [ ] Entity properties: AUM, stage focus, token ticker, chain, raise amounts, etc.
- [ ] Minimum input validation (>200 chars) to reduce poor quality graphs

**Graph Generation & Storage**
- [ ] URL ingestion: scrape public URL → cap at 32k chars → send to GPT-4o
- [ ] Text ingestion: paste raw text → send to GPT-4o
- [ ] SSRF prevention: validate URL against private IP ranges and blocked domains before fetch
- [ ] URL content caching in Redis (1 hour TTL) — same URL = single scrape
- [ ] Neo4j Aura graph persistence with per-user ownership (`created_by` field)
- [ ] Neo4j constraints: unique IDs for Investor, Project, Round nodes

**Frontend — Next.js 14 App Router**
- [ ] Landing page: hero with input box, demo graph embed, how-it-works, use cases, social proof
- [ ] Protected dashboard (`/app`): input → graph canvas (Cytoscape) + node detail sidebar
- [ ] Graph history page (`/app/history`): list of past graphs with search, view, export, delete
- [ ] Individual graph page (`/app/graph/[id]`): load saved graph from Neo4j
- [ ] Node/edge visual styling by entity type (Investor=indigo ellipse, Project=emerald rect, Round=amber diamond, Narrative=violet hexagon, Person=pink ellipse)
- [ ] Node interactions: click → detail panel, double-click → expand, right-click → context menu
- [ ] Loading, error, rate-limited, and empty graph states

**Rate Limiting**
- [ ] Upstash Redis sliding window rate limiter: anonymous=1/day, free=10/day, pro=100/day
- [ ] Vercel Edge rate limiting: 60 req/min per IP (brute force protection)
- [ ] 429 responses with `Retry-After` header and user-facing toast

**Export**
- [ ] Export graph as JSON (download)
- [ ] Export graph as PNG via html-to-image (replaces Graphviz)
- [ ] PNG exports stored in Vercel Blob

**Observability & Security**
- [ ] Sentry error tracking on frontend and backend
- [ ] PostHog analytics: track `graphs_generated`, `nodes_per_graph`, `export_clicks`
- [ ] Security headers: X-Frame-Options, X-Content-Type-Options, CSP via Next.js middleware
- [ ] Parameterised Cypher queries only — no string interpolation into Neo4j
- [ ] All secrets in Vercel/Railway environment variables; never committed to git

### Out of Scope

- Real-time data feeds (Crunchbase API, Nansen) — v2, requires paid data partnerships
- Graph merging / deduplication across sessions — v2, complex entity resolution problem
- Wallet tracking / on-chain data — v2, separate data pipeline needed
- Team collaboration / shared graphs — v2
- Paid tier / billing — post-MVP, needs business model validation first
- Mobile app — web-first; responsive layout is sufficient for MVP
- Cypher query UI — power user feature, not needed for MVP personas
- Background job queue (QStash) for long inputs — v2; MVP caps input at 32k chars
- Social media scraping (Twitter, LinkedIn) — blocked; legal/ToS concerns

## Context

This project forks the open-source **InstaGraph** repository (Flask + Vue.js monolith) and transforms it into a production-grade crypto intelligence tool. The existing codebase provides working proof-of-concept for the core loop (input → OpenAI → graph) but needs a full frontend rewrite, backend modernization, and layer of product features to be launch-ready.

**Existing assets worth preserving:**
- The `instructor`-based structured OpenAI output pattern (`models.py`, `main.py` AI layer)
- The Neo4j driver abstraction pattern (`drivers/neo4j.py`) — port to FastAPI
- The BeautifulSoup scraping logic — port with rate limiting + SSRF hardening

**Existing code to replace:**
- Flask routes → FastAPI routers
- Vue.js template (`templates/index.html`) → Next.js App Router
- Global `response_data` in-memory state → per-user Neo4j + Supabase persistence
- Graphviz PNG export → html-to-image client-side export

**Target architecture:**
- Next.js 14 (App Router) on Vercel (frontend + API routes)
- FastAPI on Railway (graph generation, scraping, OpenAI calls)
- Neo4j Aura Free → Pro (graph storage)
- Supabase (user metadata, graph index, audit logs)
- Upstash Redis (rate limiting + URL caching)
- Clerk (auth — email + Google OAuth)

## Constraints

- **Tech stack**: Next.js 14 + FastAPI — already decided, rest of team must align
- **AI model**: GPT-4o — required for entity extraction quality (3.5-turbo produces too many hallucinations on VC data)
- **Graph DB**: Neo4j Aura — managed service, no ops overhead; start Free tier, upgrade when needed
- **Timeline**: 6–8 weeks to launch MVP
- **Budget**: Railway free/hobby tier for backend; Neo4j Aura Free → Pro; Vercel Hobby → Pro
- **Compliance**: Must add ToS and Privacy Policy before public launch (open question — target Week 4)
- **Scraping**: Must respect robots.txt; blocked domains include Twitter/X, Facebook, Instagram (legal risk)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork InstaGraph (not rebuild from scratch) | Reuses proven OpenAI + Cytoscape + Neo4j integration pattern | — Pending |
| Full rewrite Flask → FastAPI | Async support, better type safety, OpenAPI docs, production-grade | — Pending |
| Monorepo structure (apps/web + apps/api) | Single repo for co-located deployments and shared type contracts | — Pending |
| Next.js 14 App Router | Vercel-native, SSR + edge, file-based routing | — Pending |
| Clerk for auth | Drop-in auth with JWT validation, webhooks, OAuth — fastest to ship | — Pending |
| Supabase for metadata (not Neo4j only) | Neo4j is graph-optimised, not ideal for tabular user/session metadata | — Pending |
| GPT-4o over 3.5-turbo | Significantly better entity extraction on crypto VC content | — Pending |
| Anonymous 1-graph trial | Reduces friction for first-time users before committing to sign-up | — Pending |

---
*Last updated: 2026-02-25 after initialization*
