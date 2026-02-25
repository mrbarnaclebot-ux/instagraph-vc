# Technology Stack

**Project:** GraphVC (Crypto VC Intelligence Platform)
**Researched:** 2026-02-25
**Overall Confidence:** MEDIUM-HIGH

---

## Critical Decision: Next.js Version

The PROJECT.md specifies Next.js 14, but as of February 2026, Next.js 16 is the latest stable release (16.1.6 LTS). Next.js 14 is now two major versions behind. **Recommendation: Use Next.js 15 (not 14, not 16).**

**Rationale:**
- Next.js 15 is production-stable, battle-tested for over a year, and fully supported by `@clerk/nextjs` v6
- Next.js 16 is too new (October 2025) -- ecosystem libraries may not have full compatibility yet
- Next.js 15 gives us React 19 support, Turbopack (5-10x faster HMR), and better caching control
- The `@clerk/nextjs` v6 SDK explicitly supports Next.js 15 with async `auth()` helper and static rendering by default
- Migration from 14 to 15 is minimal for a greenfield project (1-2 hours)

**Confidence:** HIGH -- verified via Next.js official blog and Clerk changelog

---

## Recommended Stack

### Frontend

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x (latest stable) | Frontend framework + API routes | Vercel-native, App Router mature, React 19 support, Turbopack stable | HIGH |
| React | 19.x | UI library | Ships with Next.js 15, Server Components stable | HIGH |
| TypeScript | 5.x | Type safety | Non-negotiable for production frontend | HIGH |
| @clerk/nextjs | ^6.38.0 | Authentication UI + middleware | Drop-in auth with App Router support, static rendering compatible, async auth() | HIGH |
| Tailwind CSS | 4.x | Styling | Utility-first, works perfectly with Server Components, no CSS-in-JS runtime cost | HIGH |
| react-cytoscapejs | ^2.0.0 | Graph visualization React wrapper | Official Plotly-maintained React component for Cytoscape.js | MEDIUM |
| cytoscape | ^3.30.x | Graph visualization engine | Existing codebase uses Cytoscape, proven for graph rendering | HIGH |
| @upstash/redis | ^1.34.x | Redis client (HTTP-based) | Serverless-compatible, works in Edge Runtime and Route Handlers | HIGH |
| @upstash/ratelimit | ^2.0.8 | Rate limiting | Purpose-built for serverless, sliding window algorithm, Edge-compatible | HIGH |
| html-to-image | ^1.11.x | PNG export | Client-side screenshot of Cytoscape canvas, replaces Graphviz | MEDIUM |

### Backend (FastAPI)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Python | 3.12 | Runtime | Current stable, good performance, full async/await support | HIGH |
| FastAPI | ^0.133.0 | API framework | Async, auto-OpenAPI docs, Pydantic v2 native, dependency injection | HIGH |
| uvicorn | ^0.34.x | ASGI server | Standard FastAPI production server, async worker support | HIGH |
| Pydantic | ^2.10.x | Data validation | Ships with FastAPI, v2 is significantly faster than v1 | HIGH |
| instructor | ^1.14.5 | Structured LLM output | Existing pattern from InstaGraph, Pydantic model -> validated LLM output | HIGH |
| openai | ^2.21.0 | OpenAI API client | Official SDK, sync + async, GPT-4o support, Responses API | HIGH |
| neo4j | ^5.28.3 | Neo4j Python driver | Async driver support, Neo4j Aura compatible. Use v5 not v6 (see below) | HIGH |
| supabase | ^2.28.0 | Supabase client | User metadata, graph index, audit logs. Use with FastAPI DI | MEDIUM |
| fastapi-clerk-auth | ^0.0.9 | Clerk JWT validation | Validates JWTs against Clerk JWKS endpoint, FastAPI dependency injection | MEDIUM |
| beautifulsoup4 | ^4.12.x | HTML scraping | Existing pattern from InstaGraph, proven for content extraction | HIGH |
| httpx | ^0.28.x | Async HTTP client | Replaces `requests` for async FastAPI. SSRF prevention via custom transport | HIGH |

### Infrastructure

| Technology | Version/Tier | Purpose | Why | Confidence |
|------------|-------------|---------|-----|------------|
| Vercel | Pro (eventually) | Frontend hosting | Native Next.js deployment, Edge Functions, Blob storage for exports | HIGH |
| Railway | Hobby/Pro | Backend hosting | Simple FastAPI deployment, auto-scaling, easy env var management | HIGH |
| Neo4j Aura | Free -> Pro | Graph database | Managed Neo4j, zero ops, starts free, scales to Pro when needed | HIGH |
| Supabase | Free -> Pro | Relational metadata | User tables, graph index, audit logs. Postgres under the hood | HIGH |
| Upstash Redis | Free -> Pay-as-you-go | Rate limiting + caching | HTTP-based Redis, serverless-native, global replication | HIGH |
| Clerk | Free -> Pro | Authentication | Email + Google OAuth, JWT tokens, webhooks for user sync | HIGH |
| Sentry | Free | Error tracking | Frontend + backend error monitoring, source maps | HIGH |
| PostHog | Free | Product analytics | Event tracking, funnels. Self-hosted option available | MEDIUM |
| Vercel Blob | Included | PNG export storage | Simple blob storage for exported graph images | MEDIUM |

---

## Key Integration Patterns

### 1. Next.js 15 App Router + FastAPI (Cross-Origin Architecture)

The frontend (Next.js on Vercel) and backend (FastAPI on Railway) are separate deployments. This is the recommended pattern:

**Next.js Route Handlers as API proxy (optional):**
```typescript
// apps/web/app/api/generate/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { getToken } = await auth();
  const token = await getToken();

  const body = await req.json();
  const response = await fetch(`${process.env.FASTAPI_URL}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return NextResponse.json(await response.json());
}
```

**Direct client-to-FastAPI (preferred for streaming):**
```typescript
// Client component calls FastAPI directly with Clerk token
import { useAuth } from '@clerk/nextjs';

const { getToken } = useAuth();
const token = await getToken();

const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/generate`, {
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ input }),
  method: 'POST',
});
```

**Recommendation:** Use Route Handlers as a thin proxy for non-streaming calls (adds CORS simplicity, hides backend URL). Use direct client-to-FastAPI only if you need streaming responses.

**Confidence:** MEDIUM -- this is a common pattern but has tradeoffs around CORS and latency.

### 2. Clerk JWT Validation in FastAPI

Two options. Recommend `fastapi-clerk-auth` for simplicity, with manual fallback understanding.

**Option A: fastapi-clerk-auth (recommended)**
```python
from fastapi import FastAPI, Depends
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer

clerk_config = ClerkConfig(
    jwks_url="https://<your-clerk-frontend-api>.clerk.accounts.dev/.well-known/jwks.json"
)
clerk_auth_guard = ClerkHTTPBearer(config=clerk_config)

@app.get("/api/v1/graphs")
async def list_graphs(credentials=Depends(clerk_auth_guard)):
    user_id = credentials.decoded["sub"]  # Clerk user ID
    return await get_user_graphs(user_id)
```

**Option B: Manual JWT validation (fallback)**
```python
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()
jwks_client = PyJWKClient(
    "https://<your-clerk-frontend-api>.clerk.accounts.dev/.well-known/jwks.json"
)

async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(credentials.credentials)
        payload = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk doesn't set aud by default
        )
        return payload
    except jwt.exceptions.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid token")
```

**Validation steps per Clerk docs:**
1. Extract token from `Authorization: Bearer <token>` header
2. Fetch public key from JWKS endpoint (cache the key)
3. Verify RS256 signature
4. Check `exp` and `nbf` claims
5. Optionally validate `azp` (authorized party) claim against allowed origins

**Confidence:** HIGH for the pattern, MEDIUM for `fastapi-clerk-auth` library stability (v0.0.9, small library).

### 3. Neo4j Async Driver with FastAPI

**Use neo4j v5.28.3, NOT v6.x.**

Rationale: Neo4j v6.0 introduced breaking changes and the `neo4j-driver` package name was deprecated (use `neo4j` package). v5.28.3 is forward-compatible with Neo4j server 2025.x and is the safer choice for a project starting now. Migrate to v6 after the ecosystem stabilizes.

```python
from contextlib import asynccontextmanager
from neo4j import AsyncGraphDatabase

# Lifespan pattern for FastAPI
@asynccontextmanager
async def lifespan(app):
    app.state.neo4j_driver = AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
    )
    yield
    await app.state.neo4j_driver.close()

app = FastAPI(lifespan=lifespan)

# Dependency injection
async def get_neo4j_session():
    async with app.state.neo4j_driver.session(database="neo4j") as session:
        yield session

@app.get("/api/v1/graphs/{graph_id}")
async def get_graph(graph_id: str, session=Depends(get_neo4j_session)):
    result = await session.run(
        "MATCH (n)-[r]->(m) WHERE n.graph_id = $graph_id RETURN n, r, m",
        graph_id=graph_id,
    )
    records = [record async for record in result]
    return records
```

**Critical:** Always use parameterized Cypher queries (`$variable`). Never interpolate strings into Cypher.

**Confidence:** HIGH -- async driver is well-documented and stable since v5.0.

### 4. Upstash Rate Limiting in Next.js Middleware

```typescript
// apps/web/middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 d'), // 10 requests per day
  analytics: true,
});

export default clerkMiddleware(async (auth, req) => {
  if (req.nextUrl.pathname.startsWith('/api/generate')) {
    const { userId } = await auth();
    const identifier = userId || req.ip || 'anonymous';
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      );
    }
  }
});
```

**Confidence:** HIGH -- this is the documented Upstash + Clerk + Next.js pattern.

### 5. Instructor + OpenAI GPT-4o for Structured Extraction

```python
import instructor
from openai import AsyncOpenAI
from pydantic import BaseModel

client = instructor.from_openai(AsyncOpenAI())

class KnowledgeGraph(BaseModel):
    nodes: list[Node]
    edges: list[Edge]

async def extract_graph(text: str) -> KnowledgeGraph:
    return await client.chat.completions.create(
        model="gpt-4o",
        response_model=KnowledgeGraph,
        messages=[
            {"role": "system", "content": VC_SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        max_retries=2,
    )
```

Use `instructor.Mode.TOOLS_STRICT` for the most reliable structured output with GPT-4o (uses OpenAI's native Structured Outputs API).

**Confidence:** HIGH -- instructor is the established pattern from the existing codebase, now at v1.14.5 with full async and Pydantic v2 support.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend framework | Next.js 15 | Next.js 14 | Two major versions behind, missing Turbopack, React 19, async auth() |
| Frontend framework | Next.js 15 | Next.js 16 | Too new (Oct 2025), ecosystem compat risk with Clerk/libraries |
| Python HTTP client | httpx | requests | `requests` is sync-only; `httpx` supports async natively for FastAPI |
| Neo4j driver | neo4j 5.28.3 | neo4j 6.1.0 | v6 has breaking changes, v5 is forward-compatible with Neo4j 2025.x |
| ASGI server | uvicorn | gunicorn+uvicorn | Gunicorn worker model adds complexity; uvicorn standalone is sufficient for Railway |
| Auth library | fastapi-clerk-auth | Manual PyJWT | Library is small (v0.0.9) but saves boilerplate; keep manual pattern as fallback |
| Styling | Tailwind CSS 4.x | styled-components | CSS-in-JS has runtime cost in Server Components; Tailwind is zero-runtime |
| Graph viz | Cytoscape.js | D3.js | Cytoscape is purpose-built for graph networks; D3 requires much more custom code |
| Graph viz | Cytoscape.js | vis.js | Cytoscape has better React wrapper, more layout algorithms, established in codebase |
| Package manager | pnpm | npm | Faster installs, strict dependency resolution, better monorepo support |
| Monorepo tool | Turborepo | Nx | Lighter weight, Vercel-native, sufficient for 2-app monorepo |

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| Pages Router | App Router is the standard; Pages Router is legacy. All new code should use App Router |
| `getServerSideProps` / `getStaticProps` | App Router uses `fetch()` with caching options and Server Components instead |
| Flask | Being replaced. No async, no auto-docs, no dependency injection |
| Graphviz (Python) | Replaced by client-side html-to-image for PNG export |
| `requests` (Python) | Sync-only; use `httpx` for async compatibility in FastAPI |
| `neo4j-driver` package | Deprecated package name. Use `neo4j` package instead |
| OpenAI SDK v0.x | Ancient. Current SDK is v2.x with completely different API surface |
| `instructor` v0.2.x | Current codebase version is ancient. v1.14.5 has Pydantic v2, async, new modes |
| CSS-in-JS (styled-components, emotion) | Runtime overhead in Server Components. Tailwind is zero-runtime |
| Prisma for Neo4j | Prisma doesn't support Neo4j. Use the native neo4j driver |
| NextAuth/Auth.js | Clerk is already decided. NextAuth adds complexity for features Clerk provides OOTB |
| Redis (self-hosted) | Upstash HTTP-based Redis is purpose-built for serverless. Self-hosted needs persistent connections |

---

## Version Pinning Strategy

Pin major versions, allow minor/patch updates:

```jsonc
// Frontend (package.json)
{
  "next": "^15",
  "@clerk/nextjs": "^6",
  "cytoscape": "^3.30",
  "react-cytoscapejs": "^2",
  "@upstash/redis": "^1.34",
  "@upstash/ratelimit": "^2.0",
  "tailwindcss": "^4"
}
```

```toml
# Backend (pyproject.toml)
[project]
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.133,<1.0",
    "uvicorn>=0.34,<1.0",
    "instructor>=1.14,<2.0",
    "openai>=2.21,<3.0",
    "neo4j>=5.28,<6.0",  # Pin to v5 explicitly
    "supabase>=2.28,<3.0",
    "fastapi-clerk-auth>=0.0.9,<1.0",
    "beautifulsoup4>=4.12,<5.0",
    "httpx>=0.28,<1.0",
    "pydantic>=2.10,<3.0",
    "sentry-sdk[fastapi]>=2.0,<3.0",
]
```

---

## Installation Commands

```bash
# Initialize monorepo
npx create-turbo@latest graphvc --example basic
cd graphvc

# Frontend (apps/web)
npx create-next-app@15 apps/web --typescript --tailwind --app --src-dir
cd apps/web
pnpm add @clerk/nextjs @upstash/redis @upstash/ratelimit cytoscape react-cytoscapejs html-to-image @sentry/nextjs posthog-js
pnpm add -D @types/cytoscape @types/react-cytoscapejs

# Backend (apps/api)
cd ../..
mkdir -p apps/api
cd apps/api
uv init --python 3.12
uv add "fastapi[standard]" uvicorn instructor openai neo4j supabase fastapi-clerk-auth beautifulsoup4 httpx pydantic sentry-sdk[fastapi]
uv add --dev pytest pytest-asyncio httpx ruff mypy
```

---

## Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=https://api.graphvc.app  # FastAPI backend URL
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
SENTRY_DSN=https://...

# Backend (.env)
CLERK_JWKS_URL=https://<frontend-api>.clerk.accounts.dev/.well-known/jwks.json
OPENAI_API_KEY=sk-...
NEO4J_URI=neo4j+s://<id>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
SENTRY_DSN=https://...
```

---

## Sources

- [Next.js 15 Release Blog](https://nextjs.org/blog/next-15) -- HIGH confidence
- [Next.js App Router Docs](https://nextjs.org/docs/app) -- HIGH confidence
- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) -- HIGH confidence
- [@clerk/nextjs v6 Changelog](https://clerk.com/changelog/2024-10-22-clerk-nextjs-v6) -- HIGH confidence
- [Clerk Manual JWT Verification](https://clerk.com/docs/backend-requests/manual-jwt) -- HIGH confidence
- [fastapi-clerk-auth on PyPI](https://pypi.org/project/fastapi-clerk-auth/) -- MEDIUM confidence (small library)
- [FastAPI on PyPI](https://pypi.org/project/fastapi/) -- v0.133.0, HIGH confidence
- [Neo4j Python Driver Docs](https://neo4j.com/docs/api/python-driver/current/) -- HIGH confidence
- [Neo4j on PyPI](https://pypi.org/project/neo4j/) -- v5.28.3 / v6.1.0, HIGH confidence
- [Instructor on PyPI](https://pypi.org/project/instructor/) -- v1.14.5, HIGH confidence
- [OpenAI Python SDK on PyPI](https://pypi.org/project/openai/) -- v2.21.0, HIGH confidence
- [Supabase Python on PyPI](https://pypi.org/project/supabase/) -- v2.28.0, HIGH confidence
- [@upstash/ratelimit on npm](https://www.npmjs.com/package/@upstash/ratelimit) -- v2.0.8, HIGH confidence
- [Upstash Rate Limiting Blog](https://upstash.com/blog/nextjs-ratelimiting) -- HIGH confidence
