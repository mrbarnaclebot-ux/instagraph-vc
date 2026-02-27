# Phase 4: Guardrails + Export - Research

**Researched:** 2026-02-27
**Domain:** Rate limiting (Upstash Redis), URL caching (Upstash Redis), graph export (Cytoscape PNG / JSON download)
**Confidence:** HIGH

## Summary

Phase 4 adds three capabilities: (1) per-user daily rate limiting on graph generation via Upstash Redis, with a modal prompting BYOK (bring-your-own-key) when the limit is hit; (2) Redis-based URL scrape caching with 1-hour TTL to deduplicate outbound HTTP requests; and (3) one-click JSON/PNG export of the current graph.

The rate limiting stack splits across two runtimes: the **backend** (FastAPI) enforces per-user daily generation limits using `upstash-ratelimit` (Python SDK) with `FixedWindow(max_requests=N, window=86400)`, while the **frontend** (Next.js Edge middleware) enforces per-IP brute-force protection using `@upstash/ratelimit` (JS SDK). Both connect to the same Upstash Redis instance over HTTP (connectionless). URL caching uses the same Upstash Redis instance with `SET key value EX 3600`. PNG export leverages Cytoscape's built-in `cy.png({full: true, output: 'blob-promise'})` -- this is superior to `html-to-image` for this use case because Cytoscape renders to its own canvas, and `cy.png()` captures the full graph extent natively without DOM-to-canvas conversion overhead. The requirement text mentions `html-to-image` but Cytoscape's built-in method is more reliable and avoids an extra dependency.

**Primary recommendation:** Use Upstash Redis (single instance) for both rate limiting and URL caching. Use Cytoscape built-in `cy.png()` instead of `html-to-image` for PNG export. Skip Vercel Blob upload -- trigger direct browser download from the blob.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Anonymous users: 1 generation per day
- Signed-in users: 3 generations per day
- Daily count resets at midnight UTC
- When limit is hit: modal appears prompting user to enter their own OpenAI API key
- Persistent usage counter always visible (e.g., "2 of 3 generations used today")
- API key stored in browser localStorage only -- never sent to backend for storage
- When user has their own API key set, rate limit is bypassed (unlimited generations)
- Floating action buttons (FAB-style) in the bottom-right corner of the graph canvas
- Always visible when a graph exists; not rendered when no graph is present
- One-click instant download -- no intermediary modal or popover
- Two buttons: Export JSON, Export PNG
- PNG captures the full graph extent (not just the current viewport)
- PNG background matches the app background (not transparent)
- JSON uses a cleaned/simplified format optimized for readability, not the raw API response
- Filenames auto-generated from graph content (e.g., "graphvc-a16z-funding-round-2026-02-27.json")
- Redis URL cache with 1-hour TTL
- Show a "cached" indicator on results served from cache (e.g., "Cached -- scraped 23 min ago")
- Refresh button available to force a fresh re-scrape, bypassing cache
- Force refresh counts as a generation against the user's daily rate limit

### Claude's Discretion
- Exact FAB button styling and icon choices
- Usage counter placement and visual treatment
- Cached indicator design and positioning
- JSON simplified format structure (as long as it's readable and contains nodes + edges)
- PNG resolution / scale factor
- Modal design for API key entry
- 429 response format and Retry-After header value

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RATE-01 | FastAPI enforces per-user daily limits via Upstash Redis: anonymous=1/day, free=3/day (CONTEXT.md overrides REQUIREMENTS.md "10"); returns 429 with Retry-After header | `upstash-ratelimit` Python SDK with `FixedWindow(max_requests=N, window=86400)` aligns to midnight UTC; multi-limiter pattern for anon vs auth tiers |
| RATE-02 | Vercel Edge middleware enforces 60 req/min per IP across all routes | `@upstash/ratelimit` JS SDK in Next.js proxy.ts (was middleware.ts, now proxy.ts in Next.js 16); `SlidingWindow(60, "60 s")` keyed by IP |
| RATE-03 | Scraped URL content cached in Upstash Redis for 1 hour (key: hash of normalized URL) | `upstash-redis` Python SDK: `redis.set(key, value, ex=3600)` / `redis.get(key)` with SHA-256 hash of normalized URL as key |
| AI-02 (Redis caching) | Cache raw scraped text in Redis for 1 hour so identical URLs skip re-scraping | Same as RATE-03 -- implemented in `scraper.py` or `service.py` as cache-check-before-scrape pattern |
| EXP-01 | User clicks "Export JSON" to download graph nodes and edges as JSON file | Browser-side: `JSON.stringify()` + `Blob` + `URL.createObjectURL()` + programmatic `<a>` click; no server round-trip needed |
| EXP-02 | User clicks "Export PNG" to capture Cytoscape canvas as PNG image | Cytoscape built-in `cy.png({full: true, output: 'blob-promise', bg: '#030712'})` + browser download; no html-to-image or Vercel Blob needed |

**Note on RATE-01 discrepancy:** REQUIREMENTS.md says "free users=10 graphs/day" but CONTEXT.md (user's locked decision) says "signed-in users: 3 generations per day." CONTEXT.md takes precedence as the most recent user decision.
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `upstash-redis` (Python) | 1.6.0 | Redis client for caching + rate limit backend | HTTP-based (connectionless), works in serverless; same Upstash instance as ratelimit |
| `upstash-ratelimit` (Python) | 1.1.0 | Per-user daily generation limits on FastAPI | Official Upstash SDK; FixedWindow/SlidingWindow algorithms; returns `allowed`, `remaining`, `reset` |
| `@upstash/ratelimit` (JS) | 2.0.8 | Per-IP brute-force protection in Edge middleware | Official SDK; designed for Next.js Edge runtime; SlidingWindow with `waitUntil` |
| `@upstash/redis` (JS) | 1.36.3 | Redis client for JS ratelimit SDK | Required by @upstash/ratelimit; HTTP-based, Edge-compatible |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Cytoscape.js (built-in) | ^3.0.0 (already installed) | PNG export via `cy.png()` | Full graph capture with background color, non-blocking blob-promise output |
| `@vercel/blob` | 2.3.0 | Blob storage for PNG uploads | **NOT RECOMMENDED** -- see Alternatives below |
| `html-to-image` | 1.11.13 | DOM-to-image capture | **NOT RECOMMENDED** -- Cytoscape has built-in export |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cytoscape `cy.png()` | `html-to-image` | html-to-image captures full DOM including overlays but adds dependency; cy.png() is native, non-blocking, captures full graph with `{full: true}`, and respects canvas background -- ideal for this use case |
| Direct browser download | Vercel Blob upload + download link | EXP-02 says "download link" but Vercel Blob adds server round-trip, BLOB_READ_WRITE_TOKEN config, and ~$0.02/GB costs; direct browser download from blob is instant, free, and simpler; recommend direct download unless sharing links are needed (deferred to v2) |
| `upstash-ratelimit` Python | Custom Redis INCR + EXPIRE | upstash-ratelimit handles race conditions, atomic operations, and window key generation; hand-rolling risks double-count bugs |
| Upstash Redis | Local Redis (already in docker-compose) | Upstash is HTTP-based (no TCP connection pool), works identically in serverless and local dev; local Redis is fine for dev but production needs Upstash for persistence |

**Installation:**
```bash
# Backend (from apps/api/)
uv add upstash-redis upstash-ratelimit

# Frontend (from monorepo root)
pnpm --filter web add @upstash/ratelimit @upstash/redis
```

## Architecture Patterns

### Recommended Project Structure
```
apps/api/app/
├── config.py              # + UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
├── dependencies.py        # + get_redis_client(), get_ratelimiter()
├── main.py                # + Redis singleton in lifespan
├── ratelimit/
│   ├── __init__.py
│   └── limiter.py         # Multi-tier rate limiter (anon vs auth)
├── scraper/
│   └── scraper.py         # + cache check before scrape, cache write after
└── generate/
    └── router.py          # + rate limit check dependency, cached indicator in response

apps/web/
├── proxy.ts               # + IP rate limiting via @upstash/ratelimit
├── components/graph/
│   ├── GraphCanvas.tsx    # + expose cyRef or onCyInit for export
│   ├── ExportFAB.tsx      # NEW: floating action buttons for JSON/PNG export
│   └── ...
├── components/ratelimit/
│   ├── UsageCounter.tsx   # NEW: "2 of 3 generations used today"
│   └── ApiKeyModal.tsx    # NEW: modal for BYOK when limit hit
└── lib/
    ├── api.ts             # + handle 429 response, parse Retry-After
    └── apikey.ts          # NEW: localStorage CRUD for user OpenAI API key
```

### Pattern 1: Multi-Tier Rate Limiting (Backend)
**What:** Two FixedWindow limiters with different prefixes for anonymous vs authenticated users.
**When to use:** When different user tiers have different rate limits.
**Example:**
```python
# Source: Context7 /upstash/ratelimit-py README.md
from upstash_ratelimit import Ratelimit, FixedWindow
from upstash_redis import Redis

redis = Redis(url="...", token="...")

# Anonymous: 1 generation per day (86400s = 24h, aligns to midnight UTC)
anon_limiter = Ratelimit(
    redis=redis,
    limiter=FixedWindow(max_requests=1, window=86400),
    prefix="ratelimit:anon",
)

# Authenticated free: 3 generations per day
auth_limiter = Ratelimit(
    redis=redis,
    limiter=FixedWindow(max_requests=3, window=86400),
    prefix="ratelimit:auth",
)

# In route handler:
def check_rate_limit(user_id: str, is_anonymous: bool) -> RateLimitResult:
    limiter = anon_limiter if is_anonymous else auth_limiter
    identifier = request.client.host if is_anonymous else user_id
    result = limiter.limit(identifier)
    if not result.allowed:
        seconds_until_reset = int(result.reset - time.time())
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "retry_after": seconds_until_reset,
                "message": "Daily limit reached",
            },
            headers={"Retry-After": str(seconds_until_reset)},
        )
    return result
```

### Pattern 2: URL Cache in Scraper (Backend)
**What:** Check Redis before making outbound HTTP request; store result with 1-hour TTL.
**When to use:** Before calling `scrape_url()` in the generate pipeline.
**Example:**
```python
import hashlib
from upstash_redis import Redis

def _cache_key(url: str) -> str:
    """Normalize URL and produce Redis key."""
    normalized = url.strip().lower().rstrip("/")
    url_hash = hashlib.sha256(normalized.encode()).hexdigest()
    return f"scrape:{url_hash}"

def get_cached_scrape(redis: Redis, url: str) -> tuple[str | None, int | None]:
    """Returns (cached_text, seconds_ago) or (None, None)."""
    key = _cache_key(url)
    text = redis.get(key)
    if text is None:
        return None, None
    ttl = redis.ttl(key)  # seconds remaining
    seconds_ago = 3600 - ttl if ttl > 0 else None
    return text, seconds_ago

def cache_scrape(redis: Redis, url: str, text: str) -> None:
    """Store scraped text with 1-hour TTL."""
    key = _cache_key(url)
    redis.set(key, text, ex=3600)
```

### Pattern 3: Edge Middleware IP Rate Limiting (Frontend)
**What:** Per-IP sliding window in Next.js proxy.ts (Edge middleware).
**When to use:** Global brute-force protection across all routes.
**Example:**
```typescript
// Source: Context7 /upstash/ratelimit-js
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),  // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  prefix: "ratelimit:ip",
  ephemeralCache: new Map(),  // In-memory cache to reduce Redis calls
})

// Inside clerkMiddleware callback:
const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1"
const { success, limit, remaining, reset } = await ratelimit.limit(ip)
if (!success) {
  return new Response(JSON.stringify({
    error: "rate_limited",
    message: "Too many requests",
  }), {
    status: 429,
    headers: {
      "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
    },
  })
}
```

### Pattern 4: Cytoscape PNG Export (Frontend)
**What:** Non-blocking full-graph PNG capture and browser download.
**When to use:** When user clicks Export PNG button.
**Example:**
```typescript
// Source: Context7 /cytoscape/cytoscape.js documentation
async function exportPng(cy: cytoscape.Core, filename: string) {
  const blob = await cy.png({
    full: true,               // Full graph extent, not just viewport
    output: 'blob-promise',   // Non-blocking
    bg: '#030712',            // Match app background (gray-950)
    scale: 2,                 // 2x for retina quality
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

### Pattern 5: JSON Export (Frontend)
**What:** Serialize current graph state and trigger browser download.
**When to use:** When user clicks Export JSON button.
**Example:**
```typescript
function exportJson(graph: VCGraph, filename: string) {
  const simplified = {
    nodes: graph.nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      ...n.properties,
    })),
    edges: graph.edges.map(e => ({
      from: e.source,
      to: e.target,
      relationship: e.relationship,
    })),
    exported_at: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(simplified, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

### Pattern 6: BYOK (Bring Your Own Key) Flow
**What:** User stores their OpenAI API key in localStorage; frontend sends it as a header; backend uses it instead of server key; rate limit is bypassed.
**When to use:** When user hits rate limit and enters their own API key.
**Example:**
```typescript
// Frontend: lib/apikey.ts
const APIKEY_STORAGE_KEY = 'graphvc_openai_api_key'

export function getUserApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(APIKEY_STORAGE_KEY)
}

export function setUserApiKey(key: string): void {
  localStorage.setItem(APIKEY_STORAGE_KEY, key)
}

export function clearUserApiKey(): void {
  localStorage.removeItem(APIKEY_STORAGE_KEY)
}

// In api.ts generateGraph():
const userKey = getUserApiKey()
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(userKey ? { 'X-OpenAI-Key': userKey } : {}),
}

// Backend: router.py
openai_key = request.headers.get("x-openai-key")
if openai_key:
    # Bypass rate limit, use user's key
    result = run_generate_pipeline(
        raw_input=body.input, driver=driver, user_id=user_id,
        supabase=supabase, openai_api_key=openai_key,
    )
else:
    # Check rate limit, use server key
    check_rate_limit(user_id, is_anonymous=(user_id == "anonymous"))
    result = run_generate_pipeline(
        raw_input=body.input, driver=driver, user_id=user_id,
        supabase=supabase,
    )
```

### Anti-Patterns to Avoid
- **Rate limit in middleware only:** Middleware can't distinguish authenticated users from anonymous -- generation limits MUST be in the backend where user identity is resolved via JWT.
- **Storing user API keys on the server:** CONTEXT.md explicitly says "never sent to backend for storage." The key is sent per-request in a header and used transiently, never persisted server-side.
- **Using html-to-image for Cytoscape canvas:** Cytoscape renders on its own canvas, not in regular DOM. html-to-image wraps DOM nodes, but the Cytoscape canvas is already a `<canvas>` element -- cy.png() reads it directly and is more reliable.
- **Vercel Blob for PNG export:** Adds server round-trip, config complexity, and cost for a feature that works entirely client-side. Use direct browser download.
- **Hand-rolling Redis rate limiting with INCR/EXPIRE:** Race conditions between INCR and EXPIRE can allow burst-through. upstash-ratelimit uses atomic Lua scripts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sliding window rate limiting | Redis INCR + EXPIRE manually | `upstash-ratelimit` SDK | Atomic Lua scripts prevent race conditions; handles window boundary correctly |
| URL normalization for cache keys | Custom regex URL normalization | `str.lower().strip().rstrip("/")` + SHA-256 | Normalization is deceptively complex (query param order, fragments, trailing slashes); hash makes key length fixed and safe |
| PNG image generation from graph | html-to-image or canvas manipulation | `cy.png({full: true, output: 'blob-promise'})` | Cytoscape's built-in method is native, non-blocking, handles full extent and background natively |
| File download trigger | Custom fetch + blob | `URL.createObjectURL()` + `<a>` click pattern | Standard browser API, no library needed, works in all modern browsers |
| Daily reset alignment | Custom cron or timestamp arithmetic | FixedWindow with `window=86400` | FixedWindow keys are `floor(unix_time / window)` -- with 86400s window this automatically aligns to midnight UTC since Unix epoch starts at 00:00:00 UTC |

**Key insight:** Every "simple" hand-rolled solution in rate limiting has a race condition. The Upstash SDK handles atomicity with Lua scripts. For export, Cytoscape's canvas is not in the regular DOM tree, so html-to-image would actually fail or produce incorrect results -- always use cy.png().

## Common Pitfalls

### Pitfall 1: FixedWindow 86400 Does Not Reset at User's Midnight
**What goes wrong:** Developers expect `FixedWindow(max_requests=3, window=86400)` to reset at each user's local midnight.
**Why it happens:** FixedWindow divides Unix time by the window size. Since Unix epoch is midnight UTC, `floor(unix_ts / 86400)` changes at midnight UTC, not the user's timezone.
**How to avoid:** This is actually the desired behavior per CONTEXT.md ("resets at midnight UTC"). Document it clearly in the UI: "Resets at midnight UTC."
**Warning signs:** Users in UTC+12 see their limit reset at noon local time.

### Pitfall 2: Cytoscape cy.png() Null Blob on Very Large Graphs
**What goes wrong:** `cy.png({full: true, output: 'blob-promise'})` resolves with null for very large graphs (thousands of nodes/elements where canvas dimensions exceed browser limits).
**Why it happens:** Browser canvas has max dimension limits (~16384px on most browsers). The `full: true` option can produce a canvas larger than the limit.
**How to avoid:** Set `maxWidth: 4096` or `maxHeight: 4096` as a safety cap. For VC funding graphs (typically <100 nodes), this will never be hit, but it's defensive.
**Warning signs:** PNG export produces an empty file or throws an error.

### Pitfall 3: Rate Limit Bypass with Missing Auth Token
**What goes wrong:** A user who is actually signed in sends a request without the auth token and gets the anonymous rate limit (1/day) instead of their authenticated limit (3/day).
**Why it happens:** Frontend fails to attach Bearer token on one request, backend sees `user_id = "anonymous"`.
**How to avoid:** The rate limiter identifier for anonymous users should be IP-based, and for authenticated users should be `user_id`. Ensure `get_current_user` gracefully handles missing token by returning anonymous identity (which it already does via `dev_skip_auth` path -- but in production, missing token = 401).
**Warning signs:** Authenticated users report hitting the limit after 1 generation.

### Pitfall 4: Cache Key Collision from URL Normalization
**What goes wrong:** Two different URLs that should be distinct produce the same cache key, or the same URL with trivial differences produces different keys.
**Why it happens:** URL normalization is hard -- `https://example.com/path` vs `https://example.com/path/` vs `https://example.com/path?` are semantically equivalent but string-different.
**How to avoid:** Normalize to lowercase, strip trailing slashes, remove empty query strings, then SHA-256 hash. Don't try to normalize query parameter order (too complex, low value).
**Warning signs:** Users report "wrong" cached results, or identical URLs bypass cache.

### Pitfall 5: BYOK API Key Exposure in Network Tab
**What goes wrong:** User's OpenAI API key is visible in browser network tab headers.
**Why it happens:** The key is sent as `X-OpenAI-Key` header on every request.
**How to avoid:** This is acceptable -- the user is explicitly providing their own key, and the risk is the same as entering it into any web form. The key should NEVER be logged server-side (not in request_log, not in error reports). Add `X-OpenAI-Key` to Sentry's `before_send` scrub list.
**Warning signs:** API key appears in Sentry breadcrumbs or Supabase request_log.

### Pitfall 6: Edge Middleware Rate Limit Blocking Clerk Auth Callbacks
**What goes wrong:** Clerk SSO callbacks (e.g., `/sign-in/sso-callback`) get rate-limited because they come from the same IP as the user's browsing session.
**Why it happens:** 60 req/min per IP includes all routes, including Clerk callback URLs which may have rapid redirects.
**How to avoid:** Exclude Clerk callback routes from IP rate limiting: `/sign-in(.*)`, `/sign-up(.*)`, `/api/webhooks/(.*)`.
**Warning signs:** Users intermittently fail to sign in via Google OAuth with a 429 error.

### Pitfall 7: Next.js 16 Uses proxy.ts Not middleware.ts
**What goes wrong:** Developer adds rate limiting to a new `middleware.ts` file, and it gets silently ignored.
**Why it happens:** Next.js 16 moved from middleware.ts to proxy.ts. The existing project already uses proxy.ts correctly for Clerk auth.
**How to avoid:** Add IP rate limiting into the existing `proxy.ts` file, composing it with the existing Clerk middleware.
**Warning signs:** Rate limit headers never appear in responses; all IPs get through unlimited.

## Code Examples

Verified patterns from official sources:

### Upstash Redis Connection Setup (Python)
```python
# Source: Context7 /websites/upstash_redis_sdks_py
from upstash_redis import Redis

# From environment variables (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
redis = Redis.from_env()

# Or explicit
redis = Redis(url="https://xxx.upstash.io", token="AXxx...")

# SET with TTL
redis.set("key", "value", ex=3600)  # expires in 1 hour

# GET
value = redis.get("key")  # returns str or None
```

### Upstash Ratelimit Response Object (Python)
```python
# Source: Context7 /upstash/ratelimit-py README.md
# Response object from ratelimit.limit():
#   allowed: bool     -- whether request may pass
#   limit: int        -- max requests in window
#   remaining: int    -- requests left in current window
#   reset: float      -- Unix timestamp (seconds) when limits reset
```

### Cytoscape PNG Export with Background (JS)
```typescript
// Source: Context7 /cytoscape/cytoscape.js documentation
// cy.png() options:
//   full: boolean     -- true = entire graph, false = current viewport
//   output: string    -- 'blob-promise' (non-blocking), 'base64', 'blob'
//   bg: string        -- background color (e.g., '#030712' for gray-950)
//   scale: number     -- pixel scaling factor (default = screen pixel ratio)
//   maxWidth: number  -- cap output width (overrides scale)
//   maxHeight: number -- cap output height (overrides scale)

const blob: Blob = await cy.png({
  full: true,
  output: 'blob-promise',
  bg: '#030712',
  scale: 2,
  maxWidth: 4096,  // Safety cap
})
```

### Edge Rate Limiting with Clerk Middleware Composition
```typescript
// Source: Context7 /upstash/ratelimit-js + existing proxy.ts pattern
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  prefix: "ratelimit:ip",
  ephemeralCache: new Map(),
})

// Routes exempt from IP rate limiting
const isRateLimitExempt = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // IP rate limit (skip for auth callbacks)
  if (!isRateLimitExempt(req)) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
    const { success, reset } = await ratelimit.limit(ip)
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', message: 'Too many requests' }),
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) },
        }
      )
    }
  }

  // Clerk auth guard (existing logic)
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})
```

### 429 Response Handling in Frontend
```typescript
// In lib/api.ts -- extend error handling:
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After')
  let detail: APIError
  try {
    detail = await response.json()
  } catch {
    detail = { error: 'rate_limited', message: 'Daily limit reached' }
  }
  throw new GraphAPIError(429, {
    ...detail,
    retry_after: retryAfter ? parseInt(retryAfter) : undefined,
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redis TCP connection pools | Upstash HTTP-based Redis (connectionless) | 2023+ | No connection management in serverless; works in Edge runtime |
| Custom INCR+EXPIRE rate limiting | upstash-ratelimit SDK with Lua scripts | 2023+ | Atomic operations, no race conditions |
| html-to-image / dom-to-image for canvas export | Cytoscape built-in cy.png() with blob-promise | cy.js 3.x+ | Native canvas export, non-blocking, no extra dependency |
| Vercel Blob for file sharing | Direct browser download via createObjectURL | N/A | Simpler for single-user download; Blob needed only for shareable links (v2) |
| middleware.ts in Next.js | proxy.ts in Next.js 16 | Next.js 16 (2025) | middleware.ts is silently ignored in Next.js 16 |

**Deprecated/outdated:**
- `html-to-image` for Cytoscape graphs: Cytoscape's canvas is not a standard DOM node; cy.png() is purpose-built
- `middleware.ts` in Next.js 16: Replaced by `proxy.ts`; code in middleware.ts is silently ignored
- Redis TCP clients (redis-py) for serverless: Connection pool exhaustion in serverless; use Upstash HTTP client

## Open Questions

1. **BYOK key validation**
   - What we know: User enters their OpenAI API key in a modal; it's stored in localStorage and sent per-request
   - What's unclear: Should the backend validate the key before accepting it (e.g., make a test API call)? Or just use it and let OpenAI errors propagate?
   - Recommendation: Use it directly and let errors propagate as 503. Validation adds latency and complexity. If the key is invalid, the user sees an immediate error and can re-enter.

2. **Usage counter data source**
   - What we know: UI shows "2 of 3 generations used today" persistently
   - What's unclear: Should this come from a new API endpoint that queries Redis remaining count, or be tracked client-side in localStorage?
   - Recommendation: Add a lightweight `GET /api/usage` endpoint that returns `{used, limit, reset}` from the rate limiter's `remaining` field. Client-side tracking would desync if user uses multiple devices.

3. **Cached indicator data flow**
   - What we know: UI shows "Cached -- scraped 23 min ago" when result comes from cache
   - What's unclear: The generate response schema needs a new field to indicate cache hit and age
   - Recommendation: Add `cache_hit: boolean` and `cache_age_seconds: int | null` to the `GenerateMeta` response schema. Backend populates these when serving from Redis cache.

4. **Filename generation for export**
   - What we know: CONTEXT.md example: "graphvc-a16z-funding-round-2026-02-27.json"
   - What's unclear: How to extract meaningful content from graph for filename
   - Recommendation: Use the graph title (auto-generated in Phase 3's `_auto_title()`) or first 3-4 node labels, slugified. Pattern: `graphvc-{slug}-{date}.{ext}`

## Sources

### Primary (HIGH confidence)
- Context7 `/upstash/ratelimit-py` - FixedWindow/SlidingWindow setup, Response metadata, multi-limiter pattern
- Context7 `/websites/upstash_redis_sdks_py` - SET with TTL, GET, connection setup
- Context7 `/upstash/ratelimit-js` - Next.js middleware integration, SlidingWindow, waitUntil pattern
- Context7 `/cytoscape/cytoscape.js` - cy.png() API, options (full, output, bg, scale, maxWidth)
- Context7 `/bubkoo/html-to-image` - toPng API (evaluated and rejected in favor of cy.png)
- Context7 `/vercel/storage` - Vercel Blob put() API (evaluated, recommend skipping for v1)
- PyPI `upstash-ratelimit` 1.1.0 - version, Python >=3.8 support
- PyPI `upstash-redis` 1.6.0 - version, Python 3.8-3.13 support
- npm `@upstash/ratelimit` 2.0.8, `@upstash/redis` 1.36.3, `@vercel/blob` 2.3.0

### Secondary (MEDIUM confidence)
- [Upstash Rate Limiting Algorithms docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms) - FixedWindow aligns to fixed time boundaries, not first-request relative
- [Upstash Python Rate Limiting tutorial](https://upstash.com/docs/redis/tutorials/python_rate_limiting) - FastAPI integration patterns
- [Cytoscape.js GitHub Issue #2992](https://github.com/cytoscape/cytoscape.js/issues/2992) - Large canvas null blob limitation

### Tertiary (LOW confidence)
- FixedWindow(86400) midnight UTC alignment: Inferred from FixedWindow using `floor(unix_time / window)` and Unix epoch being midnight UTC. HIGH confidence in the math, but not explicitly documented by Upstash as "midnight UTC aligned."

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via Context7 and official docs; versions confirmed from PyPI/npm
- Architecture: HIGH - Patterns derived from official SDK examples; project structure follows existing conventions
- Pitfalls: HIGH - cy.png() blob limitation documented in GitHub issues; Edge middleware composition pattern verified; Next.js 16 proxy.ts already used in project
- BYOK flow: MEDIUM - Transient API key header pattern is standard but security implications (logging, Sentry scrubbing) need validation during implementation

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable libraries, well-documented APIs)
