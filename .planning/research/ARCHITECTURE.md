# Architecture Patterns

**Domain:** Crypto VC Intelligence Platform (Next.js 14 + FastAPI split-backend)
**Researched:** 2026-02-25

## Recommended Architecture

### High-Level Overview

```
Browser
  |
  v
[Next.js 14 on Vercel]          (App Router: SSR pages, BFF API routes, Clerk auth)
  |           |
  |     [Route Handlers]         (BFF proxy layer: /api/graphs/*, /api/export/*)
  |           |
  v           v
[Clerk]   [FastAPI on Railway]   (Graph generation, OpenAI, scraping, Neo4j writes)
              |        |    |
              v        v    v
        [Neo4j Aura] [Upstash Redis] [Supabase]
        (graph data)  (rate limit +   (user metadata,
                       URL cache)      graph index,
                                       audit logs)
```

The architecture is a **BFF (Backend-for-Frontend) split** where Next.js owns the user-facing surface and acts as a thin proxy to FastAPI for heavy backend operations. FastAPI owns all AI/graph logic and direct database writes. This separation exists because:

1. **Vercel serverless functions have a 10s/60s timeout** -- OpenAI calls + scraping + Neo4j writes can exceed this.
2. **Railway runs persistent containers** -- FastAPI can hold Neo4j driver connection pools and handle long-running requests.
3. **Security boundary** -- The FastAPI backend is not publicly exposed; Next.js route handlers validate auth before proxying.

### Component Boundaries

| Component | Responsibility | Communicates With | Deployment |
|-----------|---------------|-------------------|------------|
| **Next.js App (apps/web)** | SSR pages, static landing, Clerk auth, BFF proxy routes, client-side graph rendering (Cytoscape), export (html-to-image) | FastAPI (via route handlers), Clerk (JWT), Supabase (reads), Upstash (rate limit check) | Vercel |
| **FastAPI Backend (apps/api)** | Graph generation orchestration, OpenAI calls, URL scraping, Neo4j graph persistence, Supabase metadata writes | Neo4j Aura (graph CRUD), Supabase (write graph metadata), Upstash Redis (URL cache), OpenAI API | Railway |
| **Neo4j Aura** | Graph storage -- nodes (Investor, Project, Round, Narrative, Person), edges (INVESTED_IN, CO_INVESTED, etc.), per-user ownership | FastAPI only (reads and writes) | Neo4j managed |
| **Supabase** | Relational metadata -- users table (Clerk sync), graphs index (id, title, user_id, created_at), request_log audit | Next.js (reads for dashboard lists), FastAPI (writes on graph creation), Clerk (webhook sync) | Supabase managed |
| **Upstash Redis** | Rate limiting (sliding window), URL content cache (1hr TTL) | Next.js (rate limit checks in middleware/route handlers), FastAPI (URL cache reads/writes) | Upstash managed |
| **Clerk** | Authentication -- email/password, Google OAuth, JWT issuance, user webhooks | Next.js (middleware + components), Supabase (webhook -> user sync) | Clerk managed |

## Data Flow

### Graph Generation Request (Primary Use Case)

This is the critical path -- a user submits a URL or text and receives an interactive graph.

```
1. User submits URL/text on /app dashboard
   |
2. Client Component sends POST to Next.js Route Handler
   POST /api/graphs/generate  { input: string, type: "url" | "text" }
   |
3. Next.js Route Handler (BFF layer):
   a. Verify Clerk JWT (auth().userId)
   b. Check Upstash rate limit (userId or IP for anon)
   c. If rate-limited: return 429 with Retry-After
   d. Forward request to FastAPI with internal API key
      POST {FASTAPI_URL}/v1/graphs/generate
      Headers: X-API-Key: {INTERNAL_API_KEY}, X-User-Id: {clerkUserId}
   |
4. FastAPI /v1/graphs/generate:
   a. If URL: check Redis cache for scraped content
   b. If cache miss: scrape URL with BeautifulSoup, validate SSRF, cache result
   c. Validate input length (>200 chars)
   d. Send to OpenAI GPT-4o with VC-specific system prompt + instructor
   e. Receive structured KnowledgeGraph (nodes, edges, metadata)
   f. Write graph to Neo4j Aura (MERGE nodes, CREATE edges, set created_by)
   g. Write graph metadata to Supabase (graphs table: id, title, user_id, node_count, created_at)
   h. Return { graph_id, nodes, edges, metadata } to Next.js
   |
5. Next.js Route Handler: return graph data to client
   |
6. Client Component: render graph with Cytoscape.js
   - Apply VC-specific styling (Investor=indigo, Project=emerald, etc.)
   - Enable interactions (click, double-click, right-click)
```

### Graph History Retrieval

```
1. User navigates to /app/history
   |
2. Server Component fetches graph list directly from Supabase
   (No round-trip through FastAPI -- Supabase JS client with Clerk JWT)
   SELECT id, title, node_count, created_at FROM graphs
   WHERE user_id = {clerkUserId} ORDER BY created_at DESC
   |
3. Server Component renders list (SSR)
   |
4. User clicks a graph -> navigate to /app/graph/[id]
   |
5. Server Component: verify ownership via Supabase
   |
6. Client Component: fetch full graph data from Next.js Route Handler
   GET /api/graphs/{id}
   -> FastAPI GET /v1/graphs/{id} (reads from Neo4j)
   -> Return nodes + edges
   |
7. Client Component: render with Cytoscape.js
```

### Authentication Flow

```
1. Clerk handles sign-up/sign-in (hosted UI or embedded components)
2. On user.created webhook -> Supabase Edge Function:
   INSERT INTO users (clerk_id, email, plan, created_at)
3. Clerk JWT available in Next.js via auth() / useAuth()
4. Next.js middleware protects /app/* routes
5. Route handlers extract userId from JWT before proxying to FastAPI
6. FastAPI trusts X-User-Id header (only accepts requests with valid X-API-Key)
```

## Monorepo Structure

Use **Turborepo** with **pnpm workspaces**. Turborepo adds task orchestration (parallel builds, caching, dependency-aware pipelines) on top of pnpm's workspace linking. Plain npm workspaces would work but lack build caching and task graph awareness.

```
instagraph-vc/
|-- turbo.json                    # Turborepo pipeline config
|-- pnpm-workspace.yaml           # Workspace definition
|-- package.json                  # Root: scripts, devDeps (turbo, prettier, eslint)
|-- .env.example                  # Shared env template
|-- .gitignore
|
|-- apps/
|   |-- web/                      # Next.js 14 App Router
|   |   |-- package.json
|   |   |-- next.config.js
|   |   |-- tsconfig.json
|   |   |-- tailwind.config.ts
|   |   |-- src/
|   |   |   |-- app/
|   |   |   |   |-- (marketing)/         # Landing page (public)
|   |   |   |   |   |-- page.tsx
|   |   |   |   |   |-- layout.tsx
|   |   |   |   |-- (dashboard)/         # Protected app routes
|   |   |   |   |   |-- app/
|   |   |   |   |   |   |-- page.tsx             # Main input + graph canvas
|   |   |   |   |   |   |-- history/page.tsx     # Graph history list
|   |   |   |   |   |   |-- graph/[id]/page.tsx  # Individual graph view
|   |   |   |   |   |-- layout.tsx               # Auth-protected layout
|   |   |   |   |-- api/
|   |   |   |   |   |-- graphs/
|   |   |   |   |   |   |-- generate/route.ts    # BFF: proxy to FastAPI
|   |   |   |   |   |   |-- [id]/route.ts        # BFF: get/delete graph
|   |   |   |   |   |-- webhooks/
|   |   |   |   |   |   |-- clerk/route.ts       # Clerk user.created webhook
|   |   |   |   |-- layout.tsx
|   |   |   |-- components/
|   |   |   |   |-- graph/
|   |   |   |   |   |-- GraphCanvas.tsx          # 'use client' - Cytoscape wrapper
|   |   |   |   |   |-- NodeDetailPanel.tsx      # 'use client' - sidebar
|   |   |   |   |   |-- GraphControls.tsx        # 'use client' - zoom/layout buttons
|   |   |   |   |-- ui/                          # Shared UI (shadcn/ui)
|   |   |   |-- lib/
|   |   |   |   |-- api-client.ts                # Typed fetch wrapper for FastAPI
|   |   |   |   |-- supabase.ts                  # Supabase client (server + browser)
|   |   |   |   |-- rate-limit.ts                # Upstash rate limiter
|   |   |   |-- middleware.ts                     # Clerk auth + rate limiting
|   |
|   |-- api/                      # FastAPI backend
|   |   |-- pyproject.toml        # Python deps (Poetry or uv)
|   |   |-- Dockerfile            # Railway deployment
|   |   |-- src/
|   |   |   |-- main.py           # FastAPI app, lifespan events
|   |   |   |-- config.py         # Settings via pydantic-settings
|   |   |   |-- routers/
|   |   |   |   |-- graphs.py     # /v1/graphs/* endpoints
|   |   |   |   |-- health.py     # /health for Railway checks
|   |   |   |-- services/
|   |   |   |   |-- graph_generator.py   # OpenAI + instructor orchestration
|   |   |   |   |-- scraper.py           # URL scraping + SSRF validation
|   |   |   |   |-- neo4j_service.py     # Neo4j read/write operations
|   |   |   |-- models/
|   |   |   |   |-- knowledge_graph.py   # Pydantic: Node, Edge, KnowledgeGraph
|   |   |   |   |-- api.py              # Request/response models
|   |   |   |-- dependencies.py          # FastAPI Depends: auth, rate limit, db
|   |   |   |-- middleware.py            # API key validation, CORS, logging
|   |
|-- packages/
|   |-- shared-types/             # Optional: shared TypeScript types
|   |   |-- package.json          # Generated from FastAPI OpenAPI spec
|   |   |-- src/
|   |   |   |-- index.ts          # Re-exports generated types
|
|-- scripts/
|   |-- generate-api-types.sh     # Export FastAPI OpenAPI -> generate TS client
```

### Turborepo Configuration

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {}
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Why Turborepo over plain npm/pnpm workspaces:**
- Build caching: `turbo build` skips unchanged apps (critical when only editing web or api).
- Task graph: `dependsOn: ["^build"]` ensures shared-types builds before web.
- `turbo dev` runs both `next dev` and `uvicorn` in parallel with interleaved output.
- Remote caching via Vercel for CI (free for hobby).

**Why not Nx:** Overkill for 2 apps + 1 shared package. Turborepo is simpler, Vercel-native, and sufficient for this scale.

## Patterns to Follow

### Pattern 1: BFF Route Handler as Auth-Validated Proxy

Next.js route handlers validate the Clerk JWT and forward to FastAPI with an internal API key. FastAPI never sees user tokens directly -- it trusts the internal key + forwarded user ID.

**When:** Every client request that needs FastAPI processing.

```typescript
// apps/web/src/app/api/graphs/generate/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { limited } = await checkRateLimit(userId)
  if (limited) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '86400' } }
    )
  }

  const body = await request.json()
  const response = await fetch(`${process.env.FASTAPI_URL}/v1/graphs/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.INTERNAL_API_KEY!,
      'X-User-Id': userId,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
```

### Pattern 2: Neo4j Async Driver as FastAPI Lifespan Singleton

Create the Neo4j driver once at FastAPI startup, share it across requests, close it on shutdown. This avoids the cold-start penalty of creating connections per request.

**When:** All Neo4j access from FastAPI.

```python
# apps/api/src/main.py
from contextlib import asynccontextmanager
from neo4j import AsyncGraphDatabase

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create driver (connection pool)
    app.state.neo4j_driver = AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
        max_connection_pool_size=10,  # Railway hobby: keep small
    )
    # Verify connectivity
    await app.state.neo4j_driver.verify_connectivity()
    yield
    # Shutdown: close driver
    await app.state.neo4j_driver.close()

app = FastAPI(lifespan=lifespan)
```

```python
# apps/api/src/dependencies.py
from fastapi import Request
from neo4j import AsyncDriver

async def get_neo4j_driver(request: Request) -> AsyncDriver:
    return request.app.state.neo4j_driver
```

**Why Railway works here:** Railway runs persistent containers (not serverless functions). The driver connection pool stays alive between requests, which is exactly what Neo4j recommends. Connection pool size should be small (5-10) to match Railway hobby tier memory limits.

### Pattern 3: Server Component for Data, Client Component for Visualization

Cytoscape.js requires DOM access and cannot run in Server Components. The pattern is: fetch data on the server, pass to a client component for rendering.

**When:** Every page that shows a graph.

```tsx
// apps/web/src/app/(dashboard)/app/graph/[id]/page.tsx  (Server Component)
import { GraphCanvas } from '@/components/graph/GraphCanvas'

export default async function GraphPage({ params }: { params: { id: string } }) {
  // Server-side: verify ownership, fetch metadata from Supabase
  const { userId } = await auth()
  const graph = await supabase
    .from('graphs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', userId)
    .single()

  if (!graph.data) notFound()

  // Graph node/edge data fetched client-side (can be large, needs streaming)
  return (
    <div className="flex h-full">
      <GraphCanvas graphId={params.id} title={graph.data.title} />
      {/* NodeDetailPanel is a sibling client component, communicates via React state */}
    </div>
  )
}
```

```tsx
// apps/web/src/components/graph/GraphCanvas.tsx
'use client'

import CytoscapeComponent from 'react-cytoscapejs'
import { useEffect, useState } from 'react'

export function GraphCanvas({ graphId, title }: { graphId: string; title: string }) {
  const [elements, setElements] = useState([])

  useEffect(() => {
    fetch(`/api/graphs/${graphId}`)
      .then(res => res.json())
      .then(data => setElements(toCytoscapeElements(data.nodes, data.edges)))
  }, [graphId])

  return <CytoscapeComponent elements={elements} layout={{ name: 'cose' }} /* ... */ />
}
```

### Pattern 4: Internal API Key for Service-to-Service Auth

FastAPI should not be publicly accessible. Use a shared secret (internal API key) that only Next.js knows.

**When:** All FastAPI endpoints.

```python
# apps/api/src/middleware.py
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_internal_key(api_key: str = Security(api_key_header)):
    if api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct FastAPI Exposure to Browser

**What:** Letting the browser call FastAPI directly (CORS open, no BFF layer).
**Why bad:** Exposes internal API surface, requires duplicating auth validation in FastAPI, leaks backend URL to clients, makes rate limiting harder (can't trust client-provided user IDs).
**Instead:** All browser traffic goes through Next.js route handlers. FastAPI only accepts requests with a valid internal API key.

### Anti-Pattern 2: Neo4j Driver Per Request

**What:** Creating a new `AsyncGraphDatabase.driver()` for each FastAPI request.
**Why bad:** Driver creation includes TLS handshake and connection pool initialization. At 10+ requests/second this causes connection exhaustion and 2-5 second overhead per request. Neo4j documentation explicitly warns against this.
**Instead:** Use the lifespan pattern (Pattern 2) to create one driver at startup.

### Anti-Pattern 3: Fetching FastAPI from Server Components

**What:** Having Next.js Server Components call route handlers (or FastAPI directly) during SSR.
**Why bad:** As documented in Next.js official docs: "For Server Components pre-rendered at build time, using Route Handlers will fail the build step." Even at runtime, it adds an unnecessary HTTP round-trip within the same process. For reads that don't need FastAPI (e.g., graph metadata lists), query Supabase directly.
**Instead:** Server Components read from Supabase directly. Only use route handlers for operations that must go through FastAPI (graph generation, Neo4j graph reads).

### Anti-Pattern 4: Storing Graph Metadata Only in Neo4j

**What:** Using Neo4j for both graph data AND tabular metadata (user profiles, graph lists, audit logs).
**Why bad:** Neo4j is optimized for traversal queries, not tabular scans. Listing "all graphs by user, sorted by date" is a simple SQL query but an awkward Cypher pattern. Also, Neo4j Aura Free has a 200K node limit -- don't waste it on metadata rows.
**Instead:** Graph topology in Neo4j, everything else in Supabase. The `graphs` table in Supabase acts as an index/catalog.

## Server Component vs Client Component Split

| Component / Page | Type | Rationale |
|------------------|------|-----------|
| Landing page (marketing) | Server | Static content, SEO, no interactivity |
| Dashboard layout + nav | Server | Auth check, no client state needed |
| Graph input form | Client | Controlled form state, loading indicators |
| GraphCanvas (Cytoscape) | Client | DOM manipulation, event handlers, layout algorithms |
| NodeDetailPanel (sidebar) | Client | Interactive, updates on node click |
| GraphControls (zoom/layout) | Client | Button handlers that call Cytoscape APIs |
| Graph history list | Server | Simple data fetch from Supabase, SSR for fast load |
| Graph history list actions (delete, export) | Client | User interactions, confirmations |
| Graph page wrapper | Server | Auth/ownership check, metadata fetch |

**Rule of thumb:** Push `'use client'` as deep as possible. The page-level component should be a Server Component that fetches metadata, with Client Components mounted inside for interactive parts only.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Neo4j Aura** | Free tier (200K nodes) | Pro tier (~2M nodes, performance SLA) | Enterprise; consider sharding by user cohort |
| **FastAPI on Railway** | Single hobby container | Scale to 2-3 containers, add health checks | Move to Kubernetes/ECS with auto-scaling |
| **Supabase** | Free tier | Pro tier, add connection pooler (PgBouncer) | Dedicated Postgres, read replicas |
| **Rate limiting** | Upstash free tier | Upstash pay-as-you-go | Same (Upstash scales horizontally) |
| **Graph generation latency** | ~5-15s (GPT-4o) | Same per-request; add QStash job queue for backpressure | Job queue mandatory; consider streaming partial results |
| **Vercel** | Hobby tier | Pro tier; may need to increase serverless function timeout | Enterprise; consider ISR for graph pages |

## Build Order (Suggested Phase Sequence)

This ordering minimizes blocked work and gets a working vertical slice earliest:

1. **Monorepo scaffolding** -- Set up Turborepo, pnpm workspaces, apps/web (Next.js), apps/api (FastAPI skeleton). Get `turbo dev` running both services locally. Reason: everything else depends on this structure.

2. **FastAPI core + Neo4j** -- Port the existing Flask AI pipeline (instructor, OpenAI, BeautifulSoup, Neo4j driver) to FastAPI with async. Verify graph generation works via curl/httpie. Reason: this is the existing proven logic, porting it confirms the backend works before building frontend.

3. **Next.js BFF + basic UI** -- Build route handlers that proxy to FastAPI. Build a minimal input form + Cytoscape rendering (no auth yet). Reason: proves the full vertical slice (input -> API -> graph -> render).

4. **Clerk auth + Supabase** -- Add Clerk middleware, protected routes, user sync webhook to Supabase. Wire up per-user ownership. Reason: auth is a cross-cutting concern best added after the core flow works.

5. **Rate limiting + Redis caching** -- Add Upstash rate limiter in Next.js route handlers, URL content caching in FastAPI. Reason: these are guardrails; add after core features work.

6. **Dashboard polish + export** -- Graph history page, individual graph pages, PNG export, error states, loading states. Reason: product polish layer on top of working infrastructure.

7. **Observability + security hardening** -- Sentry, PostHog, security headers, SSRF prevention, parameterized Cypher audit. Reason: pre-launch checklist items.

## Sources

- [Next.js BFF Guide (Official Docs, v16.1.6, 2026-02-20)](https://nextjs.org/docs/app/guides/backend-for-frontend) -- HIGH confidence
- [Next.js Server and Client Components (Official Docs)](https://nextjs.org/docs/app/getting-started/server-and-client-components) -- HIGH confidence
- [Neo4j Python Driver Manual -- Async API](https://neo4j.com/docs/api/python-driver/current/async_api.html) -- HIGH confidence
- [Neo4j Driver Best Practices](https://neo4j.com/blog/developer/neo4j-driver-best-practices/) -- HIGH confidence
- [Neo4j Python Connection Docs](https://neo4j.com/docs/python-manual/current/connect/) -- HIGH confidence
- [Generating API clients in monorepos with FastAPI & Next.js (Vinta Software)](https://www.vintasoftware.com/blog/nextjs-fastapi-monorepo) -- MEDIUM confidence
- [next-fast-turbo reference repo (Turborepo + Next.js + FastAPI)](https://github.com/cording12/next-fast-turbo) -- MEDIUM confidence
- [Clerk + Supabase User Sync (Official Clerk Blog)](https://clerk.com/blog/sync-clerk-user-data-to-supabase) -- HIGH confidence
- [Clerk Supabase Integration (Official Clerk Docs)](https://clerk.com/docs/guides/development/integrations/databases/supabase) -- HIGH confidence
- [Turborepo Next.js Guide (Official)](https://turborepo.dev/docs/guides/frameworks/nextjs) -- HIGH confidence
- [react-cytoscapejs (Plotly/GitHub)](https://github.com/plotly/react-cytoscapejs) -- HIGH confidence

---

*Architecture research: 2026-02-25*
