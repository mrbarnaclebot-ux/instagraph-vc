# Instagraph VC

> A production-grade fork of [instagraph](https://github.com/yoheinakajima/instagraph) by [@yoheinakajima](https://twitter.com/yoheinakajima), rebuilt from scratch as a Turborepo monorepo and specialized for **crypto VC relationship intelligence**.

---

## What is this?

The original **InstaGraph** by [Yohei Nakajima](https://twitter.com/yoheinakajima) (creator of BabyAGI) is a Flask app that converts text or URLs into knowledge graphs using GPT-3.5. It's a brilliant proof-of-concept that shows how AI can extract entity relationships and visualize them as interactive graphs.

This fork — **Instagraph VC** — takes that core idea and rebuilds it as a production-ready SaaS platform focused on the crypto venture capital ecosystem:

- **Rewritten backend**: Flask → FastAPI with async support, SSRF-hardened scraper, Clerk JWT auth, and Neo4j persistence via parameterized Cypher
- **Rewritten frontend**: Flask templates → Next.js 16 (App Router) with a Cytoscape.js graph canvas
- **Domain-specialized**: GPT-4o prompt and schema tuned to extract Investors, Projects, Rounds, Narratives, and People with typed relationships (LED, INVESTED_IN, RAISED, etc.)
- **Monorepo**: Turborepo with pnpm workspaces — `apps/web`, `apps/api`, `packages/shared-types`
- **Observability**: Sentry (frontend + backend), PostHog analytics, GitHub Actions CI/CD

---

## Original Project Credit

**Original author**: [Yohei Nakajima](https://twitter.com/yoheinakajima) — [@yoheinakajima](https://github.com/yoheinakajima)
**Original repo**: [github.com/yoheinakajima/instagraph](https://github.com/yoheinakajima/instagraph)
**License**: MIT

The core concept, the "text → AI extraction → graph visualization" loop, the name, and the initial architecture belong to Yohei. This fork retains the MIT license and all original attribution.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Graph | Cytoscape.js + fcose layout |
| Backend | FastAPI (Python 3.12), UV package manager |
| AI | OpenAI GPT-4o with native structured outputs |
| Database | Neo4j Aura (cloud-hosted graph DB) |
| Auth | Clerk (JWT-based, planned Phase 3) |
| Analytics | PostHog + Sentry |
| Infra | Vercel (frontend), Railway (backend), GitHub Actions CI/CD |
| Monorepo | Turborepo + pnpm workspaces |

---

## Project Structure

```
instagraph-vc/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── app/page.tsx    # Graph generation app
│   │   │   ├── not-found.tsx   # Custom 404
│   │   │   ├── sign-in/        # Auth pages (early access)
│   │   │   ├── sign-up/
│   │   │   ├── privacy/        # Privacy policy
│   │   │   └── terms/          # Terms of service
│   │   └── components/
│   │       ├── graph/          # GraphCanvas, DetailPanel, cytoscapeStyles
│   │       ├── landing/        # HeroSection, DemoGraph, LandingNav, etc.
│   │       └── input/          # InputCard, LoadingSteps
│   └── api/                    # FastAPI backend
│       └── app/
│           ├── generate/       # /api/generate endpoint + GPT-4o pipeline
│           ├── scraper/        # SSRF-hardened URL scraper + HTML extractor
│           ├── graph/          # Neo4j persistence repository
│           └── auth/           # Clerk JWT validation
└── packages/
    └── shared-types/           # TypeScript types shared between apps
```

---

## What We've Built

### Phase 1 — Backend Foundation ✅ (2026-02-25)
- FastAPI service with `POST /api/generate` and `GET /health`
- GPT-4o extraction with native structured outputs (no JSON repair needed)
- SSRF-hardened scraper (DNS resolution, private IP blocking, redirect validation, Content-Type check)
- Neo4j persistence with parameterized Cypher (injection-safe)
- Clerk JWT authentication (RS256, authorized party validation)
- Input validation: 200-char minimum for text, 500-char content yield minimum for URLs

### Phase 2 — Monorepo + Vertical Slice ✅ (2026-02-26)
- Turborepo monorepo scaffold with pnpm workspaces
- `packages/shared-types` — TypeScript types for VCGraph, GraphNode, GraphEdge
- Next.js 16 frontend with `/app` API route rewrites
- Cytoscape.js graph canvas with fcose force-directed layout
- Node type visual encoding: Investor=indigo ellipse, Project=emerald rect, Round=amber diamond, Narrative=violet hexagon, Person=pink ellipse
- Neighborhood highlighting — click node, neighbors stay lit, rest dims
- Detail panel with key-value property table and connected-node navigation
- InputCard (URL/Text tabs), LoadingSteps (animated), AbortController cancel
- GitHub Actions CI (typecheck + lint + pytest) + Vercel preview + Railway production deploys

### Phase 5 — Landing Page + Observability ✅ (2026-02-26)
- Public landing page with live anonymous trial (no sign-up required)
- Demo graph showing a sample VC network while no graph is generated
- HeroSection with gradient headline, ambient glow, node-type legend
- How It Works, Persona Cards (Analyst / Founder / Journalist), CTA Band
- Sentry integration — uncaught exceptions surfaced in < 60s
- PostHog analytics — `graph_generated` events with node_count, edge_count, source_type
- Custom 404 page, Privacy Policy, Terms of Service, Sign-in / Sign-up (early access) pages

### UI Visual Overhaul ✅ (2026-02-26)
- Graph nodes: glow effect via Cytoscape shadow properties, colored borders, round-rectangle Project nodes
- Selected node: amplified white-ring glow, deeper neighborhood dimming
- Graph canvas: subtle dot-grid background pattern
- HeroSection: ambient radial glows, gradient "network" headline, polished error state
- LandingNav: dual CTA — "Sign in" text + "Try free →" primary button

### API Hardening ✅ (2026-02-26)
- Scraper: Content-Type validation before HTML parsing (rejects PDFs, images, binaries)
- Service: OpenAI error classification — RateLimitError → 429, AuthenticationError → 503, invalid request → 400

---

## What's Left to Build

### Phase 3 — Auth + Persistence (Not started)
- Clerk sign-up / sign-in with email and Google OAuth
- Route protection: `/app/*` redirects unauthenticated users to `/sign-in`
- Per-user graph ownership: `created_by` user_id on Neo4j nodes
- Graph history at `/app/history` — searchable, with delete
- Anonymous trial limit: 1 free graph, then sign-up prompt
- Supabase request logging (user_id, endpoint, tokens used, IP, status)

### Phase 4 — Guardrails + Export (Not started)
- Rate limiting: 1 graph/day anonymous, 10 graphs/day free account (429 + Retry-After)
- Redis URL caching: identical URLs within 1 hour skip re-scrape (Upstash Redis)
- JSON export: download graph as `graph.json`
- PNG export: Cytoscape canvas capture via html-to-image

### Backlog / Nice to Have
- Ability to combine two graphs (upstream idea from original InstaGraph)
- Fuzzy node matching for graph merging (vector match + LLM confirmation)
- Expand on a specific node — zoom into one entity and re-generate
- Graph history search by entity name or relationship type
- Team workspaces / shared graphs
- Mobile-optimized graph canvas

---

## Getting Started

### Prerequisites
- Node.js 20+, pnpm 9+
- Python 3.12+, [UV](https://github.com/astral-sh/uv)
- Neo4j Aura account (free tier works)
- OpenAI API key

### Install

```bash
git clone https://github.com/your-org/instagraph-vc.git
cd instagraph-vc
pnpm install
```

### Environment

**`apps/api/.env`**
```env
OPENAI_API_KEY=sk-...
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
CLERK_SECRET_KEY=sk_live_...         # optional — skip with DEV_SKIP_AUTH=true
CLERK_AUTHORIZED_PARTY=http://localhost:3000
CLERK_FRONTEND_API=accounts.example.com
DEV_SKIP_AUTH=true                   # bypass Clerk JWT for local dev
SENTRY_DSN=https://...@sentry.io/1  # optional
```

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_POSTHOG_KEY=phc_...      # optional
```

### Run

```bash
pnpm dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Test (backend)

```bash
cd apps/api && uv run pytest
```

---

## API

### `POST /api/generate`

Extracts a VC knowledge graph from text or a URL.

**Request**
```json
{ "input": "Paradigm led a $50M Series A in EigenLayer..." }
```

**Response**
```json
{
  "graph": {
    "nodes": [
      { "id": "paradigm", "label": "Paradigm", "type": "Investor", "properties": { "aum": "$2.5B" } }
    ],
    "edges": [
      { "source": "paradigm", "target": "series-a-round", "relationship": "LED" }
    ]
  },
  "meta": {
    "session_id": "uuid",
    "token_count": 1420,
    "source_type": "text",
    "processing_ms": 3800
  }
}
```

Entity types: `Investor`, `Project`, `Round`, `Narrative`, `Person`
Relationship types: `LED`, `INVESTED_IN`, `CO_INVESTED`, `RAISED`, `FOUNDED`, `PARTNERS_AT`, `FOCUSES_ON`, `CLASSIFIED_AS`

---

## License

MIT — same as the original InstaGraph. See [LICENSE](LICENSE).

---

*Built on the shoulders of Yohei Nakajima's original InstaGraph. Go star [his repo](https://github.com/yoheinakajima/instagraph).*
