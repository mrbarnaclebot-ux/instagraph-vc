# Phase 5: Landing Page + Observability - Research

**Researched:** 2026-02-26
**Domain:** Next.js landing page, security headers, Sentry error tracking, PostHog analytics
**Confidence:** HIGH (core stack verified via official docs and Next.js 16 release notes)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Demo graph in hero**
- Fully interactive Cytoscape canvas (same as app) using hardcoded fictional-but-realistic crypto VC data
- Fictional fund/project names — invented but plausible (avoids IP/accuracy concerns)
- Animates in on load with staggered node/edge entrance using fcose layout
- Split hero layout: input card left, demo graph fills right side above the fold

**Visual style & layout**
- Dark mode base (slate/zinc 900+) — premium data tool aesthetic, node colors pop
- Tone: premium data tool (Palantir/Hex reference) — clean, precise, typography-driven, minimal decoration
- Minimal sticky nav: logo left, Sign In CTA right only — no extra nav links
- "How it works" section: numbered steps with icons (large numerals or icons, headline + 1-2 sentence description each)

**Copy & content**
- Hero headline direction: outcome-led ("Map the crypto VC network in seconds" style — concrete, tool-forward)
- 3 steps: Paste → Extract → Explore
  1. Paste a funding announcement or URL
  2. AI extracts investors, projects, rounds, and relationships
  3. Explore the interactive knowledge graph
- Persona cards: use-case led — what each audience does with the product
  - Analyst: "Track which funds lead which rounds across 100+ deals"
  - Founder: "See who's invested in your competitors before you pitch"
  - Journalist: "Map the investor network behind any narrative in minutes"
- Footer: minimal — logo + © year + Privacy Policy + Terms of Service links

**Conversion & CTAs**
- After anonymous trial on landing page: sign-up prompt modal appears in-place (same Phase 3 modal, not a redirect)
- Bottom CTA band above footer: full-width "Ready to map the VC network?" + "Start free" / "Sign up" button
- No pricing section — free trial is the hook; pricing is a future phase
- Nav is auth-aware: unauthenticated → "Sign In" button; authenticated → "Go to app" button

### Claude's Discretion
- Exact fictional names for demo graph data (companies, funds, people, round amounts)
- Specific icon choices for How it works steps
- Exact hero headline and subheading copy (within outcome-led direction)
- Loading skeleton and animation timing for demo graph entrance
- Spacing, typography scale, and component-level visual details
- CSP header configuration specifics (exact sources list)
- Sentry user context tagging implementation
- PostHog event property schema beyond what's spec'd

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FE-04 | Landing page at `/` has: hero section with input box (anonymous try), embedded animated demo graph showing a sample VC relationship, "How it works" 3-step explainer, use case cards (Analyst / Founder / Journalist), and a footer | Cytoscape reuse from existing `GraphCanvas.tsx`, `cytoscapeStyles.ts`, and `fcose` layout — all already installed. Landing page replaces current `redirect('/app')` in `apps/web/app/page.tsx`. |
| SEC-05 | Next.js middleware sets security headers on every response: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, and a Content Security Policy that covers script/style/connect sources | In Next.js 16, this is `proxy.ts` (not `middleware.ts`). Two valid approaches: `next.config.ts headers()` (simple, for non-nonce CSP) or `proxy.ts` (per-request nonce CSP). For this project the simpler `next.config.ts headers()` approach is appropriate. |
| OBS-01 | Sentry is configured on both the Next.js frontend and FastAPI backend; uncaught exceptions and API errors (5xx) are captured with user context; alert fires when error rate exceeds 1% in a 5-minute window | `@sentry/nextjs` for frontend (`instrumentation-client.ts` + `sentry.server.config.ts` + `withSentryConfig` in `next.config.ts`). `sentry-sdk` for Python backend (`sentry_sdk.init()` with `FastApiIntegration` + `StarletteIntegration`). |
| OBS-02 | PostHog is configured on the frontend and tracks `graph_generated` (with node_count, edge_count, source_type), `graph_exported` (with format), and `graph_history_viewed` events | `posthog-js` package. Client-side `PHProvider` wrapper in `app/providers.tsx` initialized with `posthog.init()`. Call `posthog.capture()` from client components where graph generation completes. |
</phase_requirements>

---

## Summary

Phase 5 has four distinct work streams that can be planned mostly independently: (1) building the landing page UI at `/`, (2) adding security headers via Next.js configuration, (3) wiring up Sentry for both frontend and backend error capture, and (4) instrumenting PostHog analytics events.

The most important architectural discovery is that this project is running **Next.js 16.1.6**, which replaced `middleware.ts` with `proxy.ts`. The exported function must be named `proxy` (not `middleware`). The old `middleware.ts` convention is deprecated and will generate warnings. All security headers can be set in `next.config.ts` via the `headers()` function for the simplest approach (no nonce needed since this project does not require strict-nonce CSP — `unsafe-inline` is acceptable given Sentry and PostHog both require it anyway). The alternative per-request `proxy.ts` approach is only necessary if a nonce-based strict CSP is required, which would force all pages to dynamic rendering and break static caching.

The landing page implementation reuses the existing Cytoscape stack (`cytoscape`, `cytoscape-fcose`, `react-cytoscapejs`, `cytoscapeStyles.ts`) that is already installed in the web app. The demo graph component will be structurally identical to `GraphCanvas.tsx` but fed hardcoded fictional data and auto-run on mount without user input. The existing `apps/web/app/page.tsx` currently just redirects to `/app` — this file will be replaced with the full landing page.

**Primary recommendation:** Set security headers in `next.config.ts headers()` (not `proxy.ts`). Use `@sentry/nextjs` wizard for frontend, `sentry-sdk` + FastAPI integration for backend. Use `posthog-js` with a `PHProvider` wrapper in `app/providers.tsx`. All three can be installed and configured independently without coupling.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sentry/nextjs` | `^9` (latest) | Frontend error capture + performance | Official Sentry SDK for Next.js; handles App Router, React 19, global-error.tsx, instrumentation hooks |
| `sentry-sdk` (Python) | `^2` (latest) | FastAPI backend error capture | Official Sentry Python SDK; auto-detects FastAPI and enables both StarletteIntegration and FastApiIntegration |
| `posthog-js` | `^1` (latest) | Frontend analytics events | Official PostHog browser SDK; React hooks (`usePostHog`), `PHProvider`, works with App Router |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cytoscape` | already installed (^3) | Demo graph canvas in hero | Reused — already in `package.json` |
| `cytoscape-fcose` | already installed (^2) | Demo graph layout with animation | Reused — already in `package.json` |
| `react-cytoscapejs` | already installed (^2) | React wrapper for Cytoscape | Reused — already in `package.json` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next.config.ts headers()` for CSP | `proxy.ts` nonce-based CSP | Nonce approach is more secure but forces dynamic rendering on all pages, disabling static generation. For this project `unsafe-inline` is already required by Sentry/PostHog, so nonce offers no real benefit. |
| PostHog Cloud (`us.i.posthog.com`) | Self-hosted PostHog | Self-hosting requires infra; cloud is fine for MVP |
| Sentry Cloud (`sentry.io`) | Self-hosted Sentry | Same reasoning |

**Installation:**
```bash
# Frontend (in apps/web/)
pnpm add @sentry/nextjs posthog-js

# Backend (in apps/api/)
uv pip install sentry-sdk[fastapi]
```

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── app/
│   ├── page.tsx                    # REPLACE: landing page (was redirect to /app)
│   ├── layout.tsx                  # UPDATE: wrap with PostHogProvider
│   ├── providers.tsx               # NEW: PostHog PHProvider (client component)
│   ├── global-error.tsx            # NEW: Sentry error boundary (generated by wizard)
│   └── app/
│       └── page.tsx                # unchanged: authenticated app page
├── components/
│   ├── landing/
│   │   ├── LandingNav.tsx          # NEW: sticky nav, logo + Sign In/Go to app
│   │   ├── HeroSection.tsx         # NEW: split layout — input + demo graph
│   │   ├── DemoGraph.tsx           # NEW: Cytoscape canvas with hardcoded data
│   │   ├── HowItWorks.tsx          # NEW: 3-step explainer
│   │   ├── PersonaCards.tsx        # NEW: Analyst/Founder/Journalist cards
│   │   ├── CtaBand.tsx             # NEW: bottom CTA before footer
│   │   └── LandingFooter.tsx       # NEW: minimal footer
│   └── graph/
│       └── [existing files]        # unchanged
├── lib/
│   └── analytics.ts                # NEW: typed PostHog capture helpers
├── proxy.ts                        # NEW: security headers (Next.js 16 name)
├── instrumentation-client.ts       # NEW: Sentry browser init (generated by wizard)
├── instrumentation.ts              # NEW: Sentry server/edge init (generated by wizard)
├── sentry.server.config.ts         # NEW: Sentry server config
└── next.config.ts                  # UPDATE: withSentryConfig + headers()

apps/api/
└── app/
    └── main.py                     # UPDATE: sentry_sdk.init() at startup
```

### Pattern 1: Security Headers in next.config.ts (SEC-05)
**What:** Add all required security headers via the `headers()` function in `next.config.ts`. This applies headers at the build/routing layer, not per-request, so it works with static generation.
**When to use:** When nonce-based CSP is not required (i.e., `unsafe-inline` is acceptable).

```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
// apps/web/next.config.ts

import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-inline required: Sentry injects inline scripts, PostHog uses inline event handlers
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // connect-src: API calls (self + proxied FastAPI), Sentry, PostHog
      "connect-src 'self' https://o*.ingest.sentry.io https://*.sentry.io https://us.i.posthog.com https://us-assets.i.posthog.com",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",  // equivalent to X-Frame-Options: SAMEORIGIN for modern browsers
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  transpilePackages: ['@graphvc/shared-types'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
})
```

**Note on Next.js 16 proxy.ts:** The `proxy.ts` file is the NEW name for `middleware.ts` in Next.js 16. If additional per-request logic is needed (auth checks, redirects), create `apps/web/proxy.ts` with `export function proxy(request)`. For security headers alone, `next.config.ts headers()` is simpler and does not need a proxy file.

### Pattern 2: Sentry Frontend Setup (OBS-01)
**What:** Use the Sentry wizard to generate `instrumentation-client.ts`, `sentry.server.config.ts`, `instrumentation.ts`, and `global-error.tsx`. Wrap `next.config.ts` with `withSentryConfig`.
**When to use:** Always — manual setup is error-prone; wizard handles Next.js 16 App Router correctly.

```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
// apps/web/instrumentation-client.ts (client-side init)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  sendDefaultPii: true,  // captures user email/IP from request if available
})
```

```typescript
// apps/web/sentry.server.config.ts (server-side init)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: true,
})
```

**User context tagging:** Call `Sentry.setUser({ id, email })` in client components after auth resolves. On the server (Server Components), call it at the top of the component. This is per-request — it does NOT persist across requests.

### Pattern 3: Sentry FastAPI Backend Setup (OBS-01)
**What:** Initialize `sentry_sdk` at startup before any route registration. Both `StarletteIntegration` and `FastApiIntegration` must be explicitly listed since FastAPI sits on top of Starlette.

```python
# Source: https://docs.sentry.io/platforms/python/integrations/fastapi/
# apps/api/app/main.py — add BEFORE app = FastAPI(...)
import sentry_sdk
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.sentry_dsn,
    traces_sample_rate=0.1,
    send_default_pii=True,
    integrations=[
        StarletteIntegration(),
        FastApiIntegration(),
    ],
)
```

**User context per-request:**
```python
# In a FastAPI route handler, after auth validation
import sentry_sdk

sentry_sdk.set_user({
    "id": current_user.id,
    "email": current_user.email,
    "ip_address": "{{auto}}",
})
```

Call this inside the route dependency/handler after the Clerk JWT is validated (the `get_current_user` dependency already runs auth, so set_user can follow immediately).

### Pattern 4: PostHog Setup (OBS-02)
**What:** Create a client-side `PostHogProvider` component that wraps the app. Initialize PostHog once on the client side. Use `posthog.capture()` directly or via `usePostHog()` hook for custom events.

```typescript
// Source: https://posthog.com/docs/libraries/next-js
// apps/web/app/providers.tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: 'https://us.i.posthog.com',
      defaults: '2026-01-30',
      capture_pageview: false,  // manual pageview tracking
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

```typescript
// apps/web/app/layout.tsx — wrap children with PostHogProvider
import { PostHogProvider } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body ...>
        <PostHogProvider>
          {children}
          <Toaster richColors position="top-right" />
        </PostHogProvider>
      </body>
    </html>
  )
}
```

**Capturing custom events in client components:**
```typescript
// apps/web/lib/analytics.ts — typed helpers
import posthog from 'posthog-js'

export function captureGraphGenerated(nodeCount: number, edgeCount: number, sourceType: 'url' | 'text') {
  posthog.capture('graph_generated', {
    node_count: nodeCount,
    edge_count: edgeCount,
    source_type: sourceType,
  })
}

export function captureGraphExported(format: 'json' | 'png') {
  posthog.capture('graph_exported', { format })
}

export function captureGraphHistoryViewed() {
  posthog.capture('graph_history_viewed')
}
```

**Where to call captureGraphGenerated:** In `apps/web/app/app/page.tsx`, inside the `handleSubmit` success branch after `setGraph(data.graph)` and `setStatus('success')`.

### Pattern 5: Demo Graph Component (FE-04)
**What:** A static Cytoscape canvas (no user input) that auto-runs the fcose layout with animation on mount. Reuses `cytoscapeStyles.ts` exactly. Fed hardcoded fictional data.

```typescript
// apps/web/components/landing/DemoGraph.tsx
'use client'

import dynamic from 'next/dynamic'

// CRITICAL: ssr:false required — same as app GraphCanvas
const DemoGraphCanvas = dynamic(() => import('./DemoGraphCanvas'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-900 animate-pulse rounded-lg" />,
})

// Hardcoded fictional VC data (Claude's discretion for names)
export const DEMO_GRAPH_DATA = {
  nodes: [
    { id: 'n1', label: 'Apex Ventures', type: 'Investor', properties: { aum: '$2.1B', stage: 'Seed, Series A' } },
    { id: 'n2', label: 'ChainProtocol', type: 'Project', properties: { chain: 'Ethereum', token: 'CPROTO' } },
    { id: 'n3', label: 'Meridian Capital', type: 'Investor', properties: { aum: '$800M', stage: 'Series A, B' } },
    { id: 'n4', label: 'Series A Round', type: 'Round', properties: { amount: '$18M', date: '2024-Q3' } },
    { id: 'n5', label: 'DeFi Infrastructure', type: 'Narrative', properties: {} },
    { id: 'n6', label: 'Sara Chen', type: 'Person', properties: { role: 'Partner' } },
  ],
  edges: [
    { source: 'n1', target: 'n4', relationship: 'LED' },
    { source: 'n3', target: 'n4', relationship: 'INVESTED_IN' },
    { source: 'n4', target: 'n2', relationship: 'RAISED' },
    { source: 'n2', target: 'n5', relationship: 'CLASSIFIED_AS' },
    { source: 'n6', target: 'n1', relationship: 'PARTNERS_AT' },
  ],
}
```

```typescript
// apps/web/components/landing/DemoGraphCanvas.tsx
'use client'
import CytoscapeComponent from 'react-cytoscapejs'
import Cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import { cytoscapeStylesheet } from '@/components/graph/cytoscapeStyles'
import { DEMO_GRAPH_DATA } from './DemoGraph'

Cytoscape.use(fcose as Cytoscape.Ext)

export default function DemoGraphCanvas() {
  const elements = [
    ...DEMO_GRAPH_DATA.nodes.map(n => ({ data: { id: n.id, label: n.label, type: n.type, ...n.properties } })),
    ...DEMO_GRAPH_DATA.edges.map(e => ({ data: { source: e.source, target: e.target, label: e.relationship } })),
  ]

  return (
    <CytoscapeComponent
      elements={elements}
      stylesheet={cytoscapeStylesheet}
      layout={{
        name: 'fcose',
        animate: true,
        animationDuration: 800,
        animationEasing: 'ease-out',
        fit: true,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
      } as Cytoscape.LayoutOptions}
      style={{ width: '100%', height: '100%' }}
      pixelRatio={1}
      userZoomingEnabled={true}
      userPanningEnabled={true}
    />
  )
}
```

**Staggered entrance:** The `fcose` layout with `animate: true` and `animationDuration: 800` already provides a smooth animated layout convergence — all nodes/edges fly into position from initial positions. This is sufficient and consistent with the app's behavior. True staggered per-node entrance (showing nodes one-by-one) would require `cy.animation()` with `delay` per element and is unnecessarily complex — the fcose animation satisfies "animates in on load."

### Anti-Patterns to Avoid
- **Using `middleware.ts` in Next.js 16:** The file must be named `proxy.ts` and export `function proxy()`. Using `middleware.ts` still works (it's deprecated, not removed) but generates deprecation warnings and will break in a future version.
- **Initializing sentry_sdk inside the lifespan or after app creation:** Call `sentry_sdk.init()` at module level BEFORE `app = FastAPI(...)` — Sentry needs to patch request handling at import time.
- **Using `posthog.capture()` in Server Components:** PostHog is client-side only. `captureGraphGenerated` must be called in `'use client'` components. For server-side events, PostHog has a Node.js SDK but it's not in scope here.
- **Nonce-based CSP with static pages:** If a `proxy.ts` nonce approach is used, ALL pages must be dynamically rendered (no static caching). For this project use `next.config.ts headers()` with `unsafe-inline` instead.
- **Re-registering `Cytoscape.use(fcose)` inside the component:** Must be at module level, not inside the component body — re-registering on every render causes errors.
- **Rendering `DemoGraphCanvas` without `dynamic({ ssr: false })`:** `react-cytoscapejs` accesses `window` at import time and will throw during SSR.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error capture + stack traces | Custom `window.onerror` handler | `@sentry/nextjs` | Sentry handles source maps, breadcrumbs, session replay, App Router integration, and React 19 error hooks automatically |
| Error rate alerts | Custom metrics aggregation | Sentry alert rules UI | Configurable in Sentry project settings — 1% error rate threshold in 5-minute window is a standard alert |
| Analytics event queue + batching | Custom localStorage event buffer | `posthog-js` | PostHog handles batching, retry on network failure, user identification, and session association |
| CSP nonce generation + injection | Custom nonce middleware | `next.config.ts headers()` | Nonce approach forces dynamic rendering everywhere; `unsafe-inline` is already required for Sentry/PostHog scripts |
| Demo graph data shape | New data structure | Reuse `VCGraph` type from `@graphvc/shared-types` | Type safety, consistent with app graph, and DemoGraph data fits the same node/edge shape |

**Key insight:** All three observability tools (Sentry frontend, Sentry backend, PostHog) are configured with 5-10 lines of initialization code. The SDKs handle the complex parts — rate limiting, retries, batching, environment tagging, and source map uploads.

---

## Common Pitfalls

### Pitfall 1: Next.js 16 middleware.ts → proxy.ts Naming
**What goes wrong:** Creating `apps/web/middleware.ts` with `export function middleware()` instead of `proxy.ts` with `export function proxy()`.
**Why it happens:** All existing documentation, tutorials, and Stack Overflow answers reference `middleware.ts` (the old name). This project runs Next.js 16.1.6 where the convention changed.
**How to avoid:** Create `proxy.ts`, export `function proxy(request: NextRequest)`, and optionally export `const config` matcher. Codemod available: `npx @next/codemod@canary middleware-to-proxy .`
**Warning signs:** Build warnings mentioning "middleware.ts is deprecated"; if testing with `unstable_doesProxyMatch` the function name matters.

### Pitfall 2: Sentry CSP Blocking
**What goes wrong:** Sentry requests from the browser to `sentry.io` are blocked by a restrictive CSP, so errors are silently lost.
**Why it happens:** CSP `connect-src 'self'` blocks any domain not explicitly listed. Sentry sends events to `https://o*.ingest.sentry.io`.
**How to avoid:** Add `https://o*.ingest.sentry.io` and `https://*.sentry.io` to `connect-src`. Alternatively use the Sentry `tunnelRoute: '/monitoring'` option in `withSentryConfig` — this proxies Sentry requests through Next.js itself (avoids ad-blockers too) so only `'self'` is needed in `connect-src`. The `tunnelRoute` approach is strongly recommended.
**Warning signs:** Sentry dashboard shows no errors even when errors are thrown. Check browser Network tab for blocked requests to sentry.io.

### Pitfall 3: PostHog CSP Blocking
**What goes wrong:** PostHog analytics calls to `us.i.posthog.com` are blocked by CSP.
**Why it happens:** Same as Sentry — `connect-src 'self'` blocks external analytics endpoints.
**How to avoid:** Add `https://us.i.posthog.com` and `https://us-assets.i.posthog.com` to `connect-src`. EU users would need `https://eu.i.posthog.com` instead; for MVP US region is fine.
**Warning signs:** PostHog dashboard shows no events. Check Network tab for blocked requests.

### Pitfall 4: Sentry FastAPI — Missing Both Integrations
**What goes wrong:** Only instantiating `FastApiIntegration` but not `StarletteIntegration`. FastAPI errors are not captured.
**Why it happens:** FastAPI sits on top of Starlette. Both layers need their integrations registered.
**How to avoid:** Always pass BOTH `StarletteIntegration()` and `FastApiIntegration()` in the `integrations` list. Official docs explicitly require both.
**Warning signs:** Some FastAPI errors captured, others not. Middleware-level errors especially missed.

### Pitfall 5: PostHog Capture Called in Server Component
**What goes wrong:** Importing `posthog` in a Server Component or calling `posthog.capture()` outside a `'use client'` component.
**Why it happens:** `posthog-js` is a browser SDK — it expects `window`, `document`, and `localStorage`. Server Components don't have these.
**How to avoid:** All `posthog.capture()` calls must be in `'use client'` components. The `captureGraphGenerated` call belongs in `app/app/page.tsx` which is already `'use client'`.
**Warning signs:** ReferenceError for `window` or `localStorage` during SSR build or server-side render.

### Pitfall 6: Demo Graph SSR Crash
**What goes wrong:** `DemoGraphCanvas` renders server-side and crashes because `react-cytoscapejs` / `cytoscape` accesses `window` at module import time.
**Why it happens:** Same as `GraphCanvas.tsx` in the app — Cytoscape is browser-only.
**How to avoid:** Wrap `DemoGraphCanvas` with `dynamic(() => import('./DemoGraphCanvas'), { ssr: false })`. This is the same pattern used in `app/app/page.tsx` for `GraphCanvas`.
**Warning signs:** Server-side rendering error: "window is not defined" during build or page load.

### Pitfall 7: Landing Page Route Conflict
**What goes wrong:** Current `app/page.tsx` does `redirect('/app')`, so the landing page never shows.
**Why it happens:** The existing file was a placeholder redirect from Phase 2.
**How to avoid:** REPLACE (not add) `apps/web/app/page.tsx` with the landing page component. The redirect is intentional in the existing code but must be removed for this phase.
**Warning signs:** Visiting `/` immediately redirects to `/app` instead of showing the landing page.

---

## Code Examples

### Security Headers — Complete next.config.ts Pattern
```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
// Note: X-Frame-Options also covered by CSP frame-ancestors — both are set for legacy browser compat
import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      // Sentry tunnel route means connect-src only needs self when tunnelRoute is configured
      // But add PostHog directly since it has no tunnel equivalent
      "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

### Sentry Python Init — Place in main.py before app instantiation
```python
# Source: https://docs.sentry.io/platforms/python/integrations/fastapi/
import sentry_sdk
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration

# Must come BEFORE: app = FastAPI(...)
sentry_sdk.init(
    dsn=settings.sentry_dsn,   # add SENTRY_DSN to settings
    traces_sample_rate=0.1,
    send_default_pii=True,
    environment=settings.environment,  # "production" | "development"
    integrations=[
        StarletteIntegration(),
        FastApiIntegration(),
    ],
)
```

### PostHog capture — in generate success handler
```typescript
// Source: https://posthog.com/docs/product-analytics/capture-events
// In apps/web/app/app/page.tsx handleSubmit success branch
import { captureGraphGenerated } from '@/lib/analytics'

// After setGraph(data.graph) and setStatus('success'):
captureGraphGenerated(
  data.graph.nodes.length,
  data.graph.edges.length,
  lastInput.isUrl ? 'url' : 'text'
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` with `export function middleware()` | `proxy.ts` with `export function proxy()` | Next.js 16.0.0 (Oct 2025) | File must be renamed; old name deprecated |
| `sentry.client.config.ts` | `instrumentation-client.ts` | @sentry/nextjs v8.28+ / Next.js 15+ | Different file convention for Sentry client init in App Router |
| Edge Runtime for middleware | Node.js runtime for proxy | Next.js 15.5 (stable in 16) | `proxy.ts` now runs on Node.js by default — can use Node.js APIs |
| `capture_pageview: true` (default) | `capture_pageview: false` + manual tracking | PostHog 2024 | App Router navigation events aren't detected by the legacy pageview tracker; disable autocapture and fire manually |

**Deprecated/outdated:**
- `middleware.ts`: Deprecated in Next.js 16 — rename to `proxy.ts`, rename export to `proxy`. Old file still works but will be removed in a future version.
- `sentry.client.config.ts`: Still supported but the new convention is `instrumentation-client.ts`. The wizard generates the new name.
- `experimental.ppr` flag: Removed in Next.js 16, replaced by Cache Components (`cacheComponents: true`). Not relevant to this phase.

---

## Open Questions

1. **Sentry alert threshold configuration**
   - What we know: OBS-01 requires "alert fires when error rate exceeds 1% in a 5-minute window"
   - What's unclear: This alert must be configured in the Sentry project settings UI (not in code). It requires a Sentry project to exist with DSN credentials.
   - Recommendation: Create the Sentry project first (free tier is fine for MVP), get the DSN, then the planner should add a task for "configure Sentry alert rule" as a manual step with documented instructions.

2. **PostHog region (US vs EU)**
   - What we know: PostHog hosts data in US (`us.i.posthog.com`) or EU (`eu.i.posthog.com`)
   - What's unclear: User's data residency preference
   - Recommendation: Default to US (`us.i.posthog.com`) for MVP. The `api_host` in `posthog.init()` and the CSP `connect-src` domain both need to match. This is Claude's discretion per CONTEXT.md.

3. **Anonymous trial → sign-up modal (OBS-02 / AUTH-02 intersection)**
   - What we know: FE-04 requires an input box on the landing page for anonymous trial. AUTH-02 (Phase 3) specifies the sign-up prompt modal after the second attempt. Phase 5 comes after Phase 3 (AUTH-02 may already be implemented).
   - What's unclear: If AUTH-02 is complete by the time Phase 5 runs, the anonymous trial flow is already wired. If not, Phase 5 should include a simplified version (single anonymous call, no modal, just the generation result shown inline on the landing page).
   - Recommendation: The landing page input box should call the generate endpoint and display results. If the sign-up modal (Phase 3) is already built, import and reuse it. If not, defer modal — just show results inline and add a "Sign up to save" prompt below the generated graph.

---

## Sources

### Primary (HIGH confidence)
- [nextjs.org/docs/app/guides/content-security-policy](https://nextjs.org/docs/app/guides/content-security-policy) - CSP nonce vs static headers, proxy.ts patterns (version 16.1.6, updated 2026-02-24)
- [nextjs.org/docs/app/api-reference/config/next-config-js/headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) - headers() function API, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection examples (version 16.1.6, updated 2026-02-24)
- [nextjs.org/docs/app/api-reference/file-conventions/proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) - proxy.ts vs middleware.ts migration, export function proxy(), matcher config (version 16.1.6, updated 2026-02-24)
- [nextjs.org/blog/next-16](https://nextjs.org/blog/next-16) - Official Next.js 16 release notes; confirms proxy.ts rename, middleware.ts deprecation (published Oct 2025)
- [docs.sentry.io/platforms/javascript/guides/nextjs/](https://docs.sentry.io/platforms/javascript/guides/nextjs/) - Sentry Next.js installation, instrumentation-client.ts, withSentryConfig
- [docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) - Sentry config files list
- [docs.sentry.io/platforms/python/integrations/fastapi/](https://docs.sentry.io/platforms/python/integrations/fastapi/) - FastAPI Sentry setup, StarletteIntegration + FastApiIntegration requirement
- [docs.sentry.io/platforms/python/enriching-events/identify-user/](https://docs.sentry.io/platforms/python/enriching-events/identify-user/) - sentry_sdk.set_user() fields and usage

### Secondary (MEDIUM confidence)
- [posthog.com/docs/libraries/next-js](https://posthog.com/docs/libraries/next-js) - PostHog Next.js App Router setup (page rendered CSS-only during fetch, but content confirmed via search results + npm page)
- [posthog.com/tutorials/nextjs-analytics](https://posthog.com/tutorials/nextjs-analytics) - PostHog provider pattern, posthog.init() options
- WebSearch results confirming: PostHog US endpoint is `us.i.posthog.com`, PHProvider from `posthog-js/react`, `posthog.capture()` API signature

### Tertiary (LOW confidence)
- Multiple WebSearch results about PostHog `providers.tsx` pattern — verified consistent across multiple independent sources but not fetched from official docs directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Sentry and PostHog npm packages verified; Next.js 16 proxy.ts confirmed from official release notes and docs
- Architecture: HIGH — Security headers patterns from official Next.js docs; Cytoscape reuse confirmed from existing code inspection
- Pitfalls: HIGH — middleware→proxy rename confirmed from official docs; Sentry+PostHog CSP domains from official Sentry docs
- PostHog code patterns: MEDIUM — Official docs page returned CSS during WebFetch; code patterns confirmed via multiple WebSearch sources

**Research date:** 2026-02-26
**Valid until:** 2026-05-26 (stable libraries — Sentry, PostHog APIs are stable; Next.js 16 proxy.ts is the current stable convention)
