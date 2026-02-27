# Phase 3: Auth + Persistence - Research

**Researched:** 2026-02-27
**Domain:** Clerk authentication, Supabase persistence, Next.js 16 proxy.ts, anonymous trial UX
**Confidence:** HIGH (Clerk, Next.js 16 proxy.ts), MEDIUM (Supabase Python async pattern)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth pages**
- Custom branded pages — use Clerk's `<SignIn />` and `<SignUp />` components inside Next.js pages (not Clerk-hosted redirect). The existing sign-in/sign-up page stubs are the target files.
- Google OAuth only — no email/password, no GitHub. Single provider keeps auth surface minimal.
- After sign-in: redirect to `/app` (graph generator), not history.
- Auth guard: Next.js middleware redirects unauthenticated `/app/*` requests to `/sign-in` with a `?redirect_url` return param so they land back on `/app` after signing in.

**Graph history layout**
- Card grid layout at `/app/history`.
- Each card shows: auto-generated title (prominent), source URL / input preview (truncated), node count + edge count (e.g. "12 nodes · 18 relationships"), relative timestamp (e.g. "2 hours ago"), and a delete button.
- Client-side instant filter for search — no server query. Filter the already-loaded list as user types.
- Clicking a history card navigates to `/app` with the saved graph preloaded on the Cytoscape canvas (not a separate detail page).

**Graph naming & identity**
- Auto-title from source URL domain: e.g. "techcrunch.com · Feb 27" for URLs, first 60 chars of text for pasted inputs.
- Users can rename graphs inline on the history card (click title to edit in place, press Enter/blur to save).

**Anonymous trial UX**
- One free graph total, tracked via `localStorage` flag (key: `graphvc_trial_used`). Applies across both the landing page hero (`/`) and `/app` — same flag, same limit.
- When the user tries to submit a second graph (either surface), show a modal overlay: "You've used your free graph — sign up to generate more." with "Sign Up" (→ `/sign-up`) and "Maybe Later" buttons.
- "Maybe Later" dismisses the modal. The user can still view and interact with their already-generated graph, but the input stays disabled and blocked — no more free submissions.

### Claude's Discretion
- Exact card grid column count / responsive breakpoints
- Supabase client setup pattern (server component vs API route)
- Clerk middleware configuration details
- Loading skeleton on history page
- Empty state design for `/app/history` when user has no graphs yet

### Deferred Ideas (OUT OF SCOPE)
- Email/password authentication — deferred; Google OAuth only for Phase 3
- GitHub OAuth — deferred to backlog
- Graph sharing / team workspaces — Phase 4+ or separate phase
- Graph rename from the canvas view (not history) — backlog
- Rate limiting per user — Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up and sign in via Clerk with Google OAuth; all `/app/*` routes redirect unauthenticated users to `/sign-in`; Clerk JWT is sent as `Authorization: Bearer` header on all API calls | Clerk `@clerk/nextjs` 6.38.0 + `proxy.ts` clerkMiddleware; `useAuth().getToken()` for Bearer header; `[[...sign-in]]` catch-all route |
| AUTH-02 | Anonymous user can generate one graph from the landing page hero input without signing in — result is stored in `localStorage`; on second generation attempt, user sees a sign-up prompt modal | `graphvc_trial_used` localStorage flag + modal component pattern |
| AUTH-03 | Supabase contains a `users` table (id, email, plan, created_at) synced via Clerk `user.created` webhook, and a `graphs` table (id, user_id, title, source_url, node_count, edge_count, neo4j_session_id, created_at) updated on every graph save | `verifyWebhook` from `@clerk/nextjs/webhooks`; Supabase insert via Next.js Route Handler + Python SDK |
| AUTH-04 | Every API request is logged to a Supabase `request_log` table with user_id, endpoint, source_url, IP address, status code, tokens used, and timestamp | supabase-py 2.28.0 sync insert in FastAPI middleware/dependency |
| AI-05 | Generated graph nodes and edges are persisted to Neo4j Aura with `created_by: user_id` ownership field and timestamps; anonymous graphs use `created_by: "anonymous"` | `run_generate_pipeline` already receives `current_user` dict from `get_current_user` dependency; add `created_by` to `persist_graph()` |
| FE-03 | Authenticated user can view their graph history at `/app/history` showing a list of past graphs (title, node count, edge count, source URL, date); can search by title, click to reload a graph, and delete a graph they own | Next.js Route Handler + Supabase `graphs` table + client-side filter |
</phase_requirements>

---

## Summary

This phase wires Clerk authentication into the existing Next.js 16.1.6 app, stores per-user graph metadata in Supabase, and enforces an anonymous one-trial limit. The project already has the backend JWT validation infrastructure (PyJWT + JWKS in `apps/api/app/auth/clerk.py`) and the frontend sign-in/sign-up page stubs. Phase 3 fills in the gaps: installing `@clerk/nextjs`, wiring `<ClerkProvider>` in the root layout, creating the auth guard in `proxy.ts`, replacing the stub pages with real Clerk `<SignIn />`/`<SignUp />` components, attaching the JWT Bearer header to all API calls, and writing graph metadata to Supabase on each generation.

The biggest architectural decision is the two-layer auth model: Clerk protects `proxy.ts` (route guard) and the FastAPI backend independently validates the same JWT via JWKS. The frontend must explicitly call `useAuth().getToken()` and attach `Authorization: Bearer <token>` to every request to `/api/*` — Next.js rewrites proxy the request to FastAPI on the server side, which reads the Authorization header (not cookies).

Supabase is used for tabular metadata only (users, graphs, request_log) — not for graph topology (that stays in Neo4j). The Python backend uses `supabase-py` v2.28.0 for synchronous inserts in FastAPI route handlers. The Next.js frontend uses Next.js Route Handlers (with `auth()` from Clerk) that call Supabase to serve the history page.

**Primary recommendation:** Install `@clerk/nextjs@6.38.0`, create `proxy.ts` (not `middleware.ts` — project uses Next.js 16), wrap layout in `<ClerkProvider>`, wire real `<SignIn />`/`<SignUp />` at the catch-all routes, update `lib/api.ts` to attach Bearer token, add `supabase-py` to FastAPI for request logging, and build the history API Route Handler in Next.js.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@clerk/nextjs` | 6.38.0 | Auth provider, components, hooks, middleware | Official Clerk SDK for Next.js; ships ClerkProvider, SignIn/SignUp components, clerkMiddleware, auth(), useAuth() |
| `supabase` (Python) | 2.28.0 | Supabase client for FastAPI — insert to users, graphs, request_log | Official Supabase Python SDK; synchronous create_client() fits FastAPI sync routes |
| `@supabase/supabase-js` | 2.x (latest) | Supabase client for Next.js Route Handlers | Standard Supabase JS SDK for server-side inserts/selects in Route Handlers |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `date-fns` or `Intl.RelativeTimeFormat` | Relative timestamps ("2 hours ago") | History card timestamps; prefer native `Intl` to avoid extra dep |
| Native `localStorage` API | Anonymous trial flag | No library needed — direct `localStorage.getItem/setItem` |
| Next.js Route Handlers (`app/api/*/route.ts`) | History API endpoints (list, delete, rename) | Server-side Clerk auth + Supabase queries; replaces pages/api |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `supabase-py` sync | `supabase-py-async` | Async version exists but adds complexity; sync is sufficient for fire-and-forget request logging |
| Next.js Route Handler for history | Server Component fetch | Route Handler enables proper 401 responses; Server Component fetch can't easily return 4xx |
| `date-fns` | `Intl.RelativeTimeFormat` | `Intl` is native, zero bundle cost, adequate for "X hours ago" patterns |

**Installation:**

Frontend (Next.js):
```bash
pnpm add @clerk/nextjs @supabase/supabase-js
```

Backend (FastAPI):
```bash
uv add supabase
```

---

## Architecture Patterns

### Recommended Project Structure Changes

```
apps/web/
├── proxy.ts                          # NEW: Clerk auth guard (was middleware.ts in Next.js ≤15)
├── app/
│   ├── layout.tsx                    # MODIFY: wrap with <ClerkProvider>
│   ├── sign-in/
│   │   └── [[...sign-in]]/           # RENAME/MOVE: catch-all required by Clerk
│   │       └── page.tsx              # REPLACE stub with <SignIn /> component
│   ├── sign-up/
│   │   └── [[...sign-up]]/           # RENAME/MOVE: catch-all required by Clerk
│   │       └── page.tsx              # REPLACE stub with <SignUp /> component
│   └── app/
│       ├── page.tsx                  # MODIFY: add Bearer token to generateGraph call
│       └── history/
│           └── page.tsx              # NEW: graph history page with Supabase
├── lib/
│   ├── api.ts                        # MODIFY: attach Authorization header via getToken()
│   └── supabase.ts                   # NEW: Supabase client for Route Handlers

apps/api/app/
├── config.py                         # MODIFY: add supabase_url, supabase_key settings
├── main.py                           # MODIFY: init supabase client in lifespan
├── generate/
│   └── service.py                    # MODIFY: pass user_id to persist_graph; log to request_log
├── graph/
│   └── repository.py                 # MODIFY: add created_by field to persist_graph()
└── dependencies.py                   # MODIFY: add get_supabase_client dependency
```

---

### Pattern 1: Next.js 16 proxy.ts with clerkMiddleware

**What:** Route guard that protects all `/app/*` routes, leaves `/`, `/sign-in`, `/sign-up` public.

**When to use:** Required for all Clerk-protected Next.js 16 apps.

**CRITICAL:** The project uses Next.js 16.1.6. The file MUST be named `proxy.ts` (not `middleware.ts`). The function is exported as `default`. `clerkMiddleware` handles the default export requirement automatically.

```typescript
// Source: https://clerk.com/docs/reference/nextjs/clerk-middleware (verified Feb 2026)
// File: apps/web/proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes — everything else is protected
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/privacy(.*)',
  '/terms(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

---

### Pattern 2: ClerkProvider in root layout.tsx

**What:** Wraps entire app to provide Clerk context.

**CRITICAL:** ClerkProvider can be used in a Server Component layout — it does NOT require `'use client'`.

```typescript
// Source: https://clerk.com/docs/nextjs/getting-started/quickstart (verified Feb 2026)
// apps/web/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body ...>
          <PostHogProvider>
            {children}
            <Toaster richColors position="top-right" />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

---

### Pattern 3: Custom Sign-In / Sign-Up Pages

**What:** Clerk `<SignIn />` and `<SignUp />` components embedded in existing branded page layouts.

**CRITICAL:** The existing stubs at `app/sign-in/page.tsx` and `app/sign-up/page.tsx` must be moved to `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx`. The catch-all slug `[[...sign-in]]` is required for Clerk's multi-step auth flow routing.

```typescript
// Source: https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page (verified Feb 2026)
// apps/web/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-950 ...">
      {/* Keep existing nav */}
      <div className="flex-1 flex items-center justify-center ...">
        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full max-w-sm',
              card: 'bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl',
              // ... more appearance overrides to match dark theme
            }
          }}
        />
      </div>
    </div>
  )
}
```

Required environment variables:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app
```

---

### Pattern 4: Bearer Token Attachment for FastAPI Calls

**What:** The FastAPI backend reads `Authorization: Bearer` headers (not cookies). Since the Next.js rewrite proxies `/api/*` to FastAPI server-side, cookies set by Clerk are NOT forwarded. The client must explicitly get the JWT and attach it.

**CRITICAL:** Although Next.js rewrites make `/api/*` appear same-origin to the browser, FastAPI reads the Authorization header — not cookies. `useAuth().getToken()` must be called and the token attached to every request.

```typescript
// Source: https://clerk.com/docs/guides/development/making-requests (verified Feb 2026)
// apps/web/lib/api.ts — modified generateGraph function
import type { GenerateResponse, APIError } from '@graphvc/shared-types'

export async function generateGraph(
  input: string,
  signal: AbortSignal,
  getToken: () => Promise<string | null>,  // from useAuth()
): Promise<GenerateResponse> {
  const token = await getToken()

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ input }),
    signal,
  })
  // ... error handling unchanged
}
```

In the calling component (`apps/web/app/app/page.tsx`):
```typescript
'use client'
import { useAuth } from '@clerk/nextjs'

export default function AppPage() {
  const { getToken } = useAuth()
  // ...
  const handleSubmit = useCallback(async (input: string, isUrl: boolean) => {
    const data = await generateGraph(input, controller.signal, getToken)
    // ...
  }, [getToken])
}
```

---

### Pattern 5: Clerk Webhook for User Sync (AUTH-03)

**What:** Next.js Route Handler that receives Clerk `user.created` events and upserts to Supabase `users` table.

```typescript
// Source: https://clerk.com/docs/webhooks/sync-data (verified Feb 2026)
// apps/web/app/api/webhooks/clerk/route.ts
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role bypasses RLS for sync
)

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req)

    if (evt.type === 'user.created') {
      const { id, email_addresses, created_at } = evt.data
      const email = email_addresses[0]?.email_address ?? ''

      await supabase.from('users').upsert({
        id,          // Clerk user_id is the primary key
        email,
        plan: 'free',
        created_at: new Date(created_at).toISOString(),
      })
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('Webhook verification failed', { status: 400 })
  }
}
```

Environment variable: `CLERK_WEBHOOK_SIGNING_SECRET=whsec_...`

---

### Pattern 6: FastAPI Request Logging to Supabase (AUTH-04)

**What:** After-request middleware in FastAPI that inserts one row to `request_log` per API call.

```python
# Source: supabase-py docs + FastAPI middleware pattern (verified Feb 2026)
# apps/api/app/main.py — add Supabase client in lifespan + middleware

from supabase import create_client, Client
from starlette.middleware.base import BaseHTTPMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... existing neo4j setup ...
    app.state.supabase: Client = create_client(
        settings.supabase_url,
        settings.supabase_key,
    )
    yield
    app.state.neo4j_driver.close()
```

```python
# In generate/router.py — log after each request
# apps/api/app/generate/router.py
import time
from fastapi import Request

@router.post("/generate", response_model=GenerateResponse)
async def generate(
    request: Request,
    body: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    driver: Driver = Depends(get_neo4j_driver),
) -> GenerateResponse:
    start = time.time()
    result = run_generate_pipeline(
        raw_input=body.input,
        driver=driver,
        user_id=current_user.get("sub", "anonymous"),
    )
    processing_ms = int((time.time() - start) * 1000)

    # AUTH-04: Log request to Supabase
    try:
        request.app.state.supabase.table("request_log").insert({
            "user_id": current_user.get("sub", "anonymous"),
            "endpoint": "/api/generate",
            "source_url": body.input if body.input.startswith("https://") else None,
            "ip": request.client.host if request.client else None,
            "status_code": 200,
            "tokens_used": result["meta"]["token_count"],
            "processing_ms": processing_ms,
        }).execute()
    except Exception:
        pass  # Fire-and-forget — logging failure must not fail the request

    return result
```

---

### Pattern 7: Graph History API Route Handler (FE-03)

**What:** Next.js Route Handler that fetches/deletes from Supabase `graphs` table, protected by Clerk `auth()`.

```typescript
// apps/web/app/api/graphs/route.ts
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/graphs — list user's graphs
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('graphs')
    .select('id, title, source_url, node_count, edge_count, neo4j_session_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/graphs/[id]
// apps/web/app/api/graphs/[id]/route.ts
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Ownership check — only delete if user owns the graph
  const { error } = await supabase
    .from('graphs')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId)  // Prevents deleting other users' graphs

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

---

### Pattern 8: Graph Persistence with user_id (AI-05)

**What:** Add `created_by` (user_id) and `created_at` timestamp to Neo4j nodes when persisting. Write metadata row to Supabase `graphs` table.

The existing `persist_graph()` in `apps/api/app/graph/repository.py` needs a `user_id` parameter:

```python
# apps/api/app/graph/repository.py — add user_id to CREATE
def persist_graph(
    driver: Driver,
    session_id: str,
    nodes: list[dict],
    edges: list[dict],
    user_id: str = "anonymous",  # AI-05: ownership field
) -> None:
    with driver.session() as session:
        session.run(
            """
            UNWIND $nodes AS node
            CREATE (n:Entity {
                id:         node.id,
                label:      node.label,
                type:       node.type,
                properties: node.properties,
                session_id: $session_id,
                created_by: $user_id,
                created_at: datetime()
            })
            """,
            nodes=serialized_nodes,
            session_id=session_id,
            user_id=user_id,
        )
        # ... edges unchanged ...
```

Then in `service.py`, also write to Supabase `graphs` table (after neo4j persist):
```python
# apps/api/app/generate/service.py
def run_generate_pipeline(raw_input, driver, user_id="anonymous", supabase=None):
    # ... existing pipeline ...
    persist_graph(driver, session_id=session_id, nodes=nodes, edges=edges, user_id=user_id)

    # AUTH-03 / FE-03: save graph metadata to Supabase
    if supabase and user_id != "anonymous":
        title = _auto_title(raw_input)
        try:
            supabase.table("graphs").insert({
                "user_id": user_id,
                "title": title,
                "source_url": raw_input if raw_input.startswith("https://") else None,
                "node_count": len(nodes),
                "edge_count": len(edges),
                "neo4j_session_id": session_id,
            }).execute()
        except Exception:
            pass  # Non-blocking
```

---

### Pattern 9: Anonymous Trial via localStorage

**What:** One free graph per browser. `graphvc_trial_used` flag persists across page reloads. Works on both `/` landing page and `/app`.

```typescript
// Shared utility — apps/web/lib/trial.ts
export const TRIAL_KEY = 'graphvc_trial_used'

export function isTrialUsed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(TRIAL_KEY) === 'true'
}

export function markTrialUsed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRIAL_KEY, 'true')
}
```

In HeroSection and AppPage — before allowing a generation:
```typescript
// Check trial before submitting
if (!isSignedIn && isTrialUsed()) {
  setShowTrialModal(true)
  return
}
// After successful generation:
if (!isSignedIn) markTrialUsed()
```

Trial Modal is a client component — simple overlay with "Sign Up" CTA and "Maybe Later" dismiss.

---

### Anti-Patterns to Avoid

- **Using `middleware.ts` instead of `proxy.ts`:** The project is on Next.js 16.1.6. `middleware.ts` is deprecated. Clerk's `clerkMiddleware` exports as `default` — this satisfies Next.js 16 proxy.ts requirements.
- **Relying on Clerk cookies for FastAPI auth:** The FastAPI backend reads `Authorization: Bearer` headers only. Cookies are session-specific to the browser-Next.js layer. Always call `getToken()` and attach the header explicitly.
- **`sign-in/page.tsx` instead of `sign-in/[[...sign-in]]/page.tsx`:** Clerk's multi-step flows (factor verification, social OAuth callback) need the optional catch-all slug. Missing it breaks Google OAuth redirects.
- **Creating a new Supabase client per request in FastAPI:** Initialize once in lifespan and store in `app.state.supabase` (same pattern as Neo4j driver singleton per SEC-04).
- **Blocking the request on logging failures:** Supabase inserts for `request_log` must be fire-and-forget (wrap in try/except, never raise).
- **Using `auth.protect()` in proxy.ts for `/sign-in` itself:** Causes an infinite redirect loop. Always explicitly mark `/sign-in(.*)` and `/sign-up(.*)` as public routes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT validation (frontend) | Custom JWT parsing in Next.js | `clerkMiddleware()` + Clerk session cookies | Clerk handles token refresh, key rotation, session expiry |
| JWT validation (backend) | Already done! `apps/api/app/auth/clerk.py` uses PyJWT + JWKS | Existing `get_current_user` dependency | Backend JWT validation is already complete in Phase 1 |
| User session state | Custom React context for auth | `useAuth()` / `useUser()` from `@clerk/nextjs` | Clerk hooks provide `userId`, `isSignedIn`, `getToken()` |
| Webhook signature verification | Manual HMAC validation | `verifyWebhook` from `@clerk/nextjs/webhooks` | Clerk's `verifyWebhook` handles timing-safe comparison |
| Relative timestamps | Custom date math | `Intl.RelativeTimeFormat` (native) | No extra dependency; works in all modern browsers |
| Auth redirect after sign-in | Custom redirect logic | Clerk `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` env var | Handles `?redirect_url` preservation automatically |

**Key insight:** Backend JWT validation (`get_current_user`) was built in Phase 1. The frontend needs Clerk context (`ClerkProvider`, `useAuth`) but must manually attach `Bearer` tokens to requests because FastAPI reads headers, not cookies.

---

## Common Pitfalls

### Pitfall 1: sign-in route not a catch-all
**What goes wrong:** Clerk's OAuth redirect and multi-factor flows route to `/sign-in/sso-callback`, `/sign-in/factor-one` etc. A flat `sign-in/page.tsx` (no catch-all) returns 404 for these sub-routes.
**Why it happens:** Clerk's JS SDK navigates to sub-paths during the sign-in flow. Without `[[...sign-in]]`, Next.js has no route to match.
**How to avoid:** The page MUST live at `app/sign-in/[[...sign-in]]/page.tsx`. Move the existing stub.
**Warning signs:** Google OAuth redirect lands on 404 page.

### Pitfall 2: middleware.ts vs proxy.ts (Next.js 16)
**What goes wrong:** Creating `middleware.ts` in Next.js 16 causes Clerk to not intercept requests; routes appear to work in dev but the auth guard silently fails.
**Why it happens:** Next.js 16 deprecated `middleware.ts` in favour of `proxy.ts`. Old filename is ignored.
**How to avoid:** Create `apps/web/proxy.ts` — not `middleware.ts`.
**Warning signs:** Protected `/app/*` routes are accessible without signing in.

### Pitfall 3: Clerk cookies not reaching FastAPI
**What goes wrong:** Authenticated user's API calls return 401 from FastAPI despite being signed in.
**Why it happens:** Clerk sets session cookies on the Next.js origin. The Next.js → FastAPI rewrite proxy forwards the request server-side but does NOT attach Clerk cookie tokens as a Bearer header automatically.
**How to avoid:** Every client component that calls the API must use `const { getToken } = useAuth()` and attach `Authorization: Bearer ${await getToken()}` to every `fetch('/api/...')` call.
**Warning signs:** `generateGraph()` returns 401 even for signed-in users.

### Pitfall 4: CSP blocking Clerk
**What goes wrong:** Clerk's sign-in widget fails silently; Google OAuth popup blocked.
**Why it happens:** The existing `next.config.ts` CSP does not include Clerk's domains in `connect-src`, `script-src`, or `img-src`.
**How to avoid:** Update `next.config.ts` CSP to add Clerk domains (see Code Examples section).
**Warning signs:** Browser console shows `Refused to connect` or `Refused to load script` errors from clerk.com domains.

### Pitfall 5: Supabase client initialized per-request in FastAPI
**What goes wrong:** Supabase creates a new HTTP connection pool on every request — under load this exhausts file descriptors.
**Why it happens:** Calling `create_client()` inside a route handler instead of at startup.
**How to avoid:** Create Supabase client once in the lifespan function, store as `app.state.supabase`. Follow the same singleton pattern established for `app.state.neo4j_driver`.
**Warning signs:** Connection timeout errors under concurrent load.

### Pitfall 6: Supabase new API key format
**What goes wrong:** Using `service_role` key name that doesn't exist in new Supabase projects.
**Why it happens:** Supabase (since 2025) uses `sb_publishable_xxx` (replaces anon key) and `sb_secret_xxx` (replaces service_role). Older docs reference `service_role`.
**How to avoid:** In new Supabase projects: use the `sb_secret_` key as the service role equivalent for server-side operations. Keep it server-only (never `NEXT_PUBLIC_`).
**Warning signs:** Supabase client initialization fails with invalid key error.

### Pitfall 7: Anonymous trial in SSR context
**What goes wrong:** `localStorage.getItem(TRIAL_KEY)` throws `ReferenceError: localStorage is not defined` in server components.
**Why it happens:** `localStorage` is a browser API — unavailable during Next.js SSR.
**How to avoid:** Always guard `localStorage` access with `typeof window === 'undefined'` check. Keep trial logic in client components only.
**Warning signs:** Build fails or runtime error during server-side render.

### Pitfall 8: Webhook handler missing from public routes
**What goes wrong:** Clerk webhook delivery to `/api/webhooks/clerk` returns 401 (clerkMiddleware blocks unauthenticated POST).
**Why it happens:** clerkMiddleware protects all non-public routes. The webhook endpoint has no Clerk session.
**How to avoid:** Add `/api/webhooks/(.*)` to the public routes matcher in `proxy.ts`. The `verifyWebhook` call provides its own authentication.
**Warning signs:** Clerk Dashboard shows failed webhook delivery with 401 status.

---

## Code Examples

### CSP Update for Clerk Domains

```typescript
// Source: https://clerk.com/docs/guides/secure/best-practices/csp-headers (verified Feb 2026)
// apps/web/next.config.ts — update securityHeaders
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API}`,
      "img-src 'self' blob: data: https://img.clerk.com",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "frame-src https://challenges.cloudflare.com",  // Required for Clerk bot protection
    ].join('; '),
  },
]
```

The Clerk frontend API domain is typically `<your-clerk-instance>.clerk.accounts.dev` in dev and your custom domain in production.

### Supabase SQL Schema

```sql
-- Users table — synced from Clerk via webhook
CREATE TABLE users (
  id          TEXT PRIMARY KEY,      -- Clerk user_id (e.g. "user_abc123")
  email       TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Graphs table — one row per graph generation for authenticated users
CREATE TABLE graphs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL REFERENCES users(id),
  title             TEXT NOT NULL,
  source_url        TEXT,            -- NULL for text inputs
  node_count        INT NOT NULL DEFAULT 0,
  edge_count        INT NOT NULL DEFAULT 0,
  neo4j_session_id  TEXT NOT NULL,   -- Links back to Neo4j graph topology
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX graphs_user_id_created_at ON graphs(user_id, created_at DESC);

-- Request log — every API call
CREATE TABLE request_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT,               -- NULL or "anonymous" for unauthenticated
  endpoint      TEXT NOT NULL,
  source_url    TEXT,
  ip            TEXT,
  status_code   INT NOT NULL,
  tokens_used   INT,
  processing_ms INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX request_log_user_id ON request_log(user_id);
CREATE INDEX request_log_created_at ON request_log(created_at DESC);
```

### Auto-Title Generation

```python
# apps/api/app/generate/service.py
from urllib.parse import urlparse
from datetime import datetime

def _auto_title(raw_input: str) -> str:
    """
    Generate a display title for a graph.
    - URL inputs: "domain.com · Feb 27"
    - Text inputs: first 60 chars, truncated with ellipsis
    """
    if raw_input.strip().startswith("https://"):
        domain = urlparse(raw_input.strip()).netloc.removeprefix("www.")
        date_str = datetime.now().strftime("%b %-d")  # "Feb 27"
        return f"{domain} · {date_str}"
    else:
        text = raw_input.strip()
        return text[:60] + "..." if len(text) > 60 else text
```

### Supabase Python Singleton (FastAPI lifespan)

```python
# Source: supabase-py docs (verified Feb 2026)
# apps/api/app/main.py
from supabase import create_client, Client

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Neo4j driver (existing)
    app.state.neo4j_driver = GraphDatabase.driver(...)
    app.state.neo4j_driver.verify_connectivity()

    # Supabase client singleton (new — AUTH-03, AUTH-04)
    app.state.supabase: Client = create_client(
        settings.supabase_url,
        settings.supabase_key,  # sb_secret_... key (service role equivalent)
    )

    yield
    app.state.neo4j_driver.close()
```

```python
# apps/api/app/dependencies.py — add supabase dependency
def get_supabase_client(request: Request) -> Client:
    """Returns the singleton Supabase client from app.state."""
    return request.app.state.supabase
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16.0.0 | Must rename file; `export default clerkMiddleware()` still works |
| `authMiddleware()` (deprecated Clerk) | `clerkMiddleware()` + `createRouteMatcher` | @clerk/nextjs v5 | `authMiddleware` removed in v6; `clerkMiddleware` is current |
| Supabase `anon` / `service_role` keys | `sb_publishable_xxx` / `sb_secret_xxx` keys | 2025 | New Supabase projects use new key format |
| Svix library for webhook verification | `verifyWebhook` from `@clerk/nextjs/webhooks` | @clerk/nextjs v6 | No need to install svix separately |
| `getAuth()` in pages router | `auth()` (async) in App Router | Next.js 13/App Router | `auth()` is async; must `await auth()` |

**Deprecated/outdated:**
- `authMiddleware()` from `@clerk/nextjs`: Removed in v6. Do NOT use. Use `clerkMiddleware()`.
- `middleware.ts` in Next.js 16: Renamed to `proxy.ts`. Clerk docs still show examples labelled "middleware.ts" but clarify: "If you're using Next.js ≤15, name your file middleware.ts".
- Svix library for Clerk webhooks: No longer needed. `verifyWebhook` is built into `@clerk/nextjs/webhooks`.

---

## Open Questions

1. **How does the Supabase `graphs` table handle the rename feature?**
   - What we know: The history card allows inline rename (click title → edit → Enter/blur saves).
   - What's unclear: Whether rename calls a PATCH `/api/graphs/[id]` Route Handler (clean) or updates local state only (risky — lost on refresh).
   - Recommendation: Build a PATCH Route Handler. Rename should be durable.

2. **Should anonymous graph generation on `/app` page require a signed-in user after Phase 3?**
   - What we know: `proxy.ts` protects all `/app/*` routes — unauthenticated users are redirected to `/sign-in`. So `/app` requires auth.
   - What's unclear: The CONTEXT.md describes the anonymous trial as applying to both `/` and `/app`. But with auth guard enabled, `/app` will require auth.
   - Recommendation: The anonymous trial on `/app` is moot once auth guard is live — unauthenticated users will be redirected to `/sign-in` before they can generate. The trial only applies to the `/` landing page hero input. Plan accordingly.

3. **How does history page reload a saved graph onto the Cytoscape canvas?**
   - What we know: Clicking a history card navigates to `/app` with the saved graph preloaded. The `neo4j_session_id` is stored in Supabase.
   - What's unclear: The mechanism — URL param (`/app?session=<id>`) that AppPage reads, or localStorage, or something else.
   - Recommendation: Use a URL search param: `/app?session=<neo4j_session_id>`. AppPage reads `searchParams.session` and fetches the graph from a new `/api/graphs/[id]/graph` Route Handler that queries Neo4j via `get_graph_by_session()` (already implemented in `repository.py`).

4. **What Supabase key type does the existing project use?**
   - What we know: New Supabase projects (2025+) use `sb_publishable_` / `sb_secret_` keys. Older projects still have `anon` / `service_role`.
   - What's unclear: When this Supabase project was created.
   - Recommendation: Check the Supabase dashboard. If keys start with `sb_`, use `sb_secret_` for server-side. If they still show `anon`/`service_role`, use `service_role`. Both work with `supabase-py`.

---

## Sources

### Primary (HIGH confidence)
- https://clerk.com/docs/nextjs/getting-started/quickstart — ClerkProvider, env vars, proxy.ts setup verified Feb 2026
- https://clerk.com/docs/reference/nextjs/clerk-middleware — clerkMiddleware + createRouteMatcher, proxy.ts naming for Next.js 16 verified Feb 2026
- https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page — `[[...sign-in]]` catch-all route requirement verified Feb 2026
- https://clerk.com/docs/guides/development/making-requests — Bearer token requirement for cross-server API calls verified Feb 2026
- https://clerk.com/docs/webhooks/sync-data — `verifyWebhook` from `@clerk/nextjs/webhooks`, `CLERK_WEBHOOK_SIGNING_SECRET` verified Feb 2026
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy — proxy.ts (Next.js 16) replaces middleware.ts, confirmed file conventions verified Feb 2026
- https://clerk.com/docs/guides/secure/best-practices/csp-headers — Clerk CSP domain requirements verified Feb 2026
- https://supabase.com/docs/reference/python/insert — supabase-py insert pattern verified Feb 2026

### Secondary (MEDIUM confidence)
- https://clerk.com/docs/guides/development/making-requests — Same-origin vs cross-origin token handling; rewrite proxy = same-origin for browser but FastAPI still needs Bearer
- https://github.com/orgs/supabase/discussions/28843 — FastAPI + Supabase singleton via Depends pattern (community verified)
- `@clerk/nextjs` v6.38.0 confirmed latest (npm Feb 2026)
- `supabase-py` v2.28.0 confirmed latest (GitHub Feb 2026)

### Tertiary (LOW confidence)
- Supabase `sb_publishable_` / `sb_secret_` key format for new projects — community sources, not directly verified against official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Clerk and Next.js 16 verified against official docs; supabase-py version confirmed from GitHub
- Architecture: HIGH — proxy.ts, catch-all routes, Bearer token requirement all verified from official sources
- Pitfalls: HIGH — proxy.ts rename, catch-all route, CSP, Bearer token all directly verified; Supabase key format is MEDIUM

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (Clerk SDK updates frequently; re-verify `@clerk/nextjs` version before implementation)
