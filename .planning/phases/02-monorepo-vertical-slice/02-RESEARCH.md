# Phase 2: Monorepo + Vertical Slice - Research

**Researched:** 2026-02-25
**Domain:** Turborepo monorepo, Next.js 15 App Router, Cytoscape.js graph UI, CI/CD (Vercel + Railway)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Input UI
- Tab toggle between "URL" and "Text" modes — tabs swap the input field type (URL input vs textarea)
- Hero-style centered layout — large centered card taking up the top portion of the page, product-first (like Perplexity / v0)
- After a graph is generated, the input area collapses to a compact bar at the top so the graph takes center stage
- Text tab placeholder: instructional copy — "Paste a funding announcement, blog post, or article about a crypto VC deal..."
- **Use the `frontend-design` skill when implementing the UI** — explicitly requested by user for high design quality

#### Loading experience
- Sequential step labels that cycle through stages: "Fetching URL..." → "Extracting entities..." → "Building graph..." — not a single static message
- Nodes fly in with animation when graph data arrives (layout runs visibly)
- While loading: dark empty canvas is shown with a centered spinner — frames the space before the graph appears
- Cancel button is visible during loading — aborts the in-flight request so user can adjust input and retry

#### Graph interactivity
- Free node dragging enabled — users can grab and reposition any node
- Scroll-to-zoom + drag-to-pan + a visible "fit" button to recenter the graph
- Clicking a node highlights its neighborhood (dims unconnected nodes and edges) AND opens the detail panel simultaneously
- Edge labels always visible by default — relationship types displayed on all edges, not hover-only

#### Detail panel
- Key-value table layout — property name left column, value right column; easy to scan
- Panel also lists connected nodes with relationship type (e.g., "INVESTED_IN → Project X"), clickable to navigate to that connected node — panel is a navigation hub
- On mobile / narrow screens: panel becomes a bottom sheet (slides up from bottom) rather than a right overlay
- Copy icon per row on hover — small clipboard icon next to each value for easy copying of addresses, amounts, names

### Claude's Discretion
- Exact Cytoscape layout algorithm (cose, dagre, etc.) — whichever works best for VC graph topology
- Animation timing and easing curves for node fly-in
- Exact spacing, typography, and edge label font size
- Error state appearance inside the graph canvas area
- How the "fit" button is positioned on the canvas

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-03 | CI/CD pipeline runs `typecheck`, `lint`, and `test` on every PR; deploys frontend to Vercel preview on PR and to production on merge to main; deploys backend to Railway on merge to main | GitHub Actions workflow with pnpm + turbo; Vercel CLI deploy action; Railway CLI action |
| FE-01 | Authenticated user sees a dashboard at `/app` with a Cytoscape.js graph canvas using VC entity styling: Investor=indigo ellipse, Project=emerald rectangle, Round=amber diamond, Narrative=violet hexagon, Person=pink ellipse; edge styles differ by relationship type; canvas uses performance-optimised Cytoscape config (haystack/bezier edges, `data()` style mappers, `pixelRatio: 1`, `hideEdgesOnViewport: true`) | Cytoscape.js style API verified; fcose layout recommended; react-cytoscapejs wrapper; dynamic import `ssr: false` pattern for Next.js |
| FE-02 | User can click any node in the graph to open a right-side detail panel showing the node's label, entity type, and all extracted properties; clicking the canvas background closes the panel | Cytoscape.js `cy.on('tap')` event handling; React state for panel; cy ref pattern via `cy` prop |
| FE-05 | User sees appropriate UI for each state: animated progress bar + "Extracting entities..." during generation; toast "Couldn't read that URL — try pasting the text instead" on scrape failure; toast "No VC relationships found" on empty graph; toast with retry button on API error | React state machine for loading/error/success; Sonner or Radix Toast for toasts; AbortController for cancel |
</phase_requirements>

---

## Summary

Phase 2 has four distinct problem domains: (1) Turborepo monorepo scaffold adding Next.js 15 alongside the existing FastAPI app; (2) a Cytoscape.js graph canvas wired to the `POST /api/generate` backend with VC entity styling; (3) a high-quality UI for input, loading states, and error toasts; and (4) a CI/CD pipeline deploying to Vercel (frontend) and Railway (backend) via GitHub Actions. Each domain is well-covered by mature tooling with clear patterns.

The biggest technical decision is how the Next.js frontend communicates with FastAPI in the same monorepo without CORS complexity. The correct answer is Next.js `rewrites` in `next.config.ts` — all `/api/*` requests from the browser are rewritten server-side to the FastAPI URL, eliminating CORS entirely. This works identically in local dev (rewrite to `localhost:8000`) and in production (rewrite to the Railway URL). No separate API proxy code is needed.

Cytoscape.js requires SSR bypass via `dynamic(() => import(...), { ssr: false })` in Next.js — it assumes `window` and `document` exist at module load time and will throw at build time otherwise. The `react-cytoscapejs` wrapper (`CytoscapeComponent`) is the correct integration layer; it accepts a `cy` callback ref for attaching event listeners, which is essential for the neighborhood-highlight and detail-panel features.

**Primary recommendation:** Scaffold the monorepo with `pnpm dlx create-turbo@latest` against the existing repo, add `apps/web` with `create-next-app`, use the Just-in-Time internal package strategy for `packages/shared-types`, use Next.js rewrites for the FastAPI proxy, and wrap `CytoscapeComponent` in a `dynamic` import with `ssr: false`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| turbo | latest (2.x) | Monorepo task orchestration, caching | Official Vercel tool; auto-detected by Vercel for monorepo deploys |
| pnpm | 9.x | Package manager with workspace support | Turborepo docs recommend pnpm; workspace:* protocol for internal packages |
| next | 15.x (15.1.8+ stable) | Frontend framework | Project decision (Phase 1 STATE.md); ships React 19, Turbopack, App Router |
| cytoscape | 3.x (latest) | Graph canvas core | Proven graph library; the existing InstaGraph fork uses it |
| react-cytoscapejs | 2.x | React wrapper for Cytoscape.js | Simplest React integration; maintained by Plotly; accepts `cy` ref callback |
| cytoscape-fcose | 2.x | Force-directed layout | fCoSE is the recommended layout for force-directed graphs (faster than cose-bilkent, aesthetically superior to cose) |
| typescript | 5.x | Type safety | Project-wide decision |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | latest | Toast notifications | Minimal, beautiful API; one line to show toasts; integrates with Tailwind; ideal for FE-05 error toasts |
| tailwindcss | 4.x | Utility CSS | High-design-quality UI per user constraint (frontend-design skill); create-next-app can scaffold with Tailwind |
| @radix-ui/react-tabs | latest | Accessible tab toggle | URL / Text tab component for input UI; headless, accessible, Tailwind-friendly |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-cytoscapejs | Raw Cytoscape.js imperative | More control but more boilerplate; react-cytoscapejs handles lifecycle correctly |
| cytoscape-fcose | cose-bilkent | cose-bilkent v4.1.0 last published 6 years ago; fcose is newer, faster, actively maintained |
| cytoscape-fcose | dagre | Dagre is hierarchical (tree-style); VC graphs are not DAGs, force-directed is better for messy multi-entity topologies |
| Next.js rewrites proxy | Next.js API Route proxy | Route proxy adds an extra network hop; rewrites are zero-code and transparent |
| sonner | Radix Toast | Sonner has a simpler API for imperative toast calls (toast.error("...")) needed during event handlers |

**Installation:**
```bash
# Root
pnpm add -D turbo
# apps/web (inside Next.js app)
pnpm add cytoscape react-cytoscapejs cytoscape-fcose sonner
pnpm add -D @types/cytoscape @types/react-cytoscapejs
```

---

## Architecture Patterns

### Recommended Project Structure

```
instagraph-vc/                    # repo root (existing)
├── apps/
│   ├── api/                      # existing FastAPI (Phase 1)
│   │   ├── app/
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   └── web/                      # NEW: Next.js 15
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx           # redirect → /app
│       │   └── app/
│       │       └── page.tsx       # /app — graph dashboard (FE-01, FE-02)
│       ├── components/
│       │   ├── graph/
│       │   │   ├── GraphCanvas.tsx     # Cytoscape canvas (dynamic import)
│       │   │   ├── DetailPanel.tsx     # right-side / bottom-sheet panel (FE-02)
│       │   │   └── cytoscapeStyles.ts  # stylesheet constants (FE-01)
│       │   ├── input/
│       │   │   ├── InputCard.tsx       # hero card / collapsed bar (CONTEXT.md)
│       │   │   └── LoadingSteps.tsx    # sequential step labels (CONTEXT.md)
│       │   └── ui/                # shared primitives (Tabs, Button, Toast)
│       ├── lib/
│       │   └── api.ts             # fetch wrapper calling /api/generate
│       ├── next.config.ts         # rewrites → FastAPI
│       └── package.json
├── packages/
│   └── shared-types/              # NEW: shared TypeScript types
│       ├── src/
│       │   └── index.ts           # GraphNode, GraphEdge, GenerateResponse
│       └── package.json
├── turbo.json
├── pnpm-workspace.yaml
└── package.json                   # root — private, delegates to turbo
```

### Pattern 1: Turborepo Monorepo Scaffold

**What:** pnpm workspaces + turbo.json for cross-app task orchestration with caching
**When to use:** Always — this is the monorepo foundation

```json
// pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// turbo.json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    }
  }
}
```

```json
// package.json (root)
{
  "name": "instagraph-vc",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

**Source:** Context7 /vercel/turborepo — verified

### Pattern 2: Just-in-Time Internal Package (packages/shared-types)

**What:** TypeScript source files exported directly — no build step. Next.js (Turbopack) compiles them on demand.
**When to use:** Pure type packages with no runtime code; zero config overhead.

```json
// packages/shared-types/package.json
{
  "name": "@graphvc/shared-types",
  "version": "0.0.1",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  }
}
```

```typescript
// packages/shared-types/src/index.ts
// Re-exports the same types from the FastAPI schemas — kept in sync manually
export type EntityType = "Investor" | "Project" | "Round" | "Narrative" | "Person";
export type RelationshipType = "LED" | "INVESTED_IN" | "CO_INVESTED" | "RAISED" | "FOUNDED" | "PARTNERS_AT" | "FOCUSES_ON" | "CLASSIFIED_AS";

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  properties: Record<string, unknown>;
}
export interface GraphEdge {
  source: string;
  target: string;
  relationship: RelationshipType;
}
export interface VCGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
export interface GenerateMeta {
  session_id: string;
  token_count: number;
  source_type: "url" | "text";
  processing_ms: number;
}
export interface GenerateResponse {
  graph: VCGraph;
  meta: GenerateMeta;
}
```

**Note:** For Just-in-Time packages to work in Next.js, add the package to `transpilePackages` in `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  transpilePackages: ['@graphvc/shared-types'],
  // ...
}
```

**Source:** Context7 /vercel/turborepo internal packages docs + Turborepo official docs

### Pattern 3: Next.js Rewrites as FastAPI Proxy

**What:** `next.config.ts` rewrites forward `/api/*` to the FastAPI host. Browser never makes a cross-origin request — CORS is eliminated.
**When to use:** Frontend and backend on different hosts in production; same-origin illusion in browser.

```typescript
// apps/web/next.config.ts
import { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@graphvc/shared-types'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
```

**Local dev:** `NEXT_PUBLIC_API_URL` unset → rewrites to `http://localhost:8000`
**Production:** `NEXT_PUBLIC_API_URL=https://your-app.up.railway.app`

**Source:** Context7 /vercel/next.js rewrites docs — verified

### Pattern 4: Cytoscape.js — SSR Bypass + React Integration

**What:** `react-cytoscapejs` requires `window`/`document` at module load. Must use `next/dynamic` with `ssr: false`.
**When to use:** Any browser-only library in Next.js App Router.

```typescript
// components/graph/GraphCanvas.tsx — the actual Cytoscape component
'use client'
import CytoscapeComponent from 'react-cytoscapejs'
import Cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import { useRef, useCallback } from 'react'
import type { VCGraph } from '@graphvc/shared-types'

Cytoscape.use(fcose)  // register once at module level

interface GraphCanvasProps {
  graph: VCGraph
  onNodeClick: (nodeId: string) => void
}

export default function GraphCanvas({ graph, onNodeClick }: GraphCanvasProps) {
  const cyRef = useRef<Cytoscape.Core | null>(null)

  const handleCyInit = useCallback((cy: Cytoscape.Core) => {
    cyRef.current = cy
    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      // Neighborhood highlight
      cy.elements().addClass('dimmed')
      node.neighborhood().add(node).removeClass('dimmed')
      // Open panel
      onNodeClick(node.id())
    })
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('dimmed')
        onNodeClick('')  // close panel
      }
    })
  }, [onNodeClick])

  const elements = [
    ...graph.nodes.map(n => ({ data: { id: n.id, label: n.label, type: n.type, ...n.properties } })),
    ...graph.edges.map(e => ({ data: { source: e.source, target: e.target, label: e.relationship } })),
  ]

  return (
    <CytoscapeComponent
      elements={elements}
      stylesheet={cytoscapeStylesheet}
      layout={{ name: 'fcose', animate: true, animationDuration: 600 }}
      cy={handleCyInit}
      style={{ width: '100%', height: '100%' }}
      pixelRatio={1}
      hideEdgesOnViewport={true}
    />
  )
}
```

```typescript
// app/app/page.tsx — wrapping in dynamic import
import dynamic from 'next/dynamic'

const GraphCanvas = dynamic(
  () => import('@/components/graph/GraphCanvas'),
  { ssr: false, loading: () => <div className="animate-spin" /> }
)
```

**Source:** Context7 /plotly/react-cytoscapejs + WebSearch verification (multiple sources confirm ssr: false is mandatory)

### Pattern 5: VC Entity Cytoscape Stylesheet (FE-01)

**What:** Cytoscape style objects mapping entity `type` data field to colors/shapes.

```typescript
// components/graph/cytoscapeStyles.ts
// Source: Context7 /cytoscape/cytoscape.js — verified style API
export const cytoscapeStylesheet: cytoscape.Stylesheet[] = [
  // Base node style
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 11,
      'color': '#fff',
      'text-outline-width': 1,
    }
  },
  // Entity-type node styles (FE-01 requirement — exact colors/shapes locked)
  {
    selector: 'node[type = "Investor"]',
    style: { 'background-color': '#6366f1', 'shape': 'ellipse', 'text-outline-color': '#6366f1' }  // indigo
  },
  {
    selector: 'node[type = "Project"]',
    style: { 'background-color': '#10b981', 'shape': 'rectangle', 'text-outline-color': '#10b981' }  // emerald
  },
  {
    selector: 'node[type = "Round"]',
    style: { 'background-color': '#f59e0b', 'shape': 'diamond', 'text-outline-color': '#f59e0b' }  // amber
  },
  {
    selector: 'node[type = "Narrative"]',
    style: { 'background-color': '#8b5cf6', 'shape': 'hexagon', 'text-outline-color': '#8b5cf6' }  // violet
  },
  {
    selector: 'node[type = "Person"]',
    style: { 'background-color': '#ec4899', 'shape': 'ellipse', 'text-outline-color': '#ec4899' }  // pink
  },
  // Dimmed state for neighborhood highlight
  {
    selector: '.dimmed',
    style: { 'opacity': 0.2 }
  },
  // Edge default (bezier with visible labels)
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': 9,
      'text-rotation': 'autorotate',
      'line-color': '#6b7280',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#6b7280',
      'width': 1.5,
    }
  },
]
```

**Note on edge style tradeoff:** FE-01 specifies `haystack` edges for performance, but edge labels are ALWAYS visible per the locked CONTEXT.md decision. Haystack edges do not support labels in Cytoscape.js. Use `bezier` (supports labels) with `hideEdgesOnViewport: true` at the canvas level for performance. This is the correct resolution of the apparent conflict — `pixelRatio: 1` and `hideEdgesOnViewport: true` are still applied.

**Source:** Context7 /cytoscape/cytoscape.js style docs + performance docs — verified

### Pattern 6: Abort Controller for Cancel Button

**What:** `AbortController` lets the fetch be cancelled when user clicks Cancel during loading.

```typescript
// lib/api.ts
export async function generateGraph(
  input: string,
  signal: AbortSignal
): Promise<GenerateResponse> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
    signal,  // abort signal wired in
  })
  if (!response.ok) {
    const error = await response.json()
    throw new GraphAPIError(response.status, error)
  }
  return response.json()
}
```

```typescript
// In the React component
const controllerRef = useRef<AbortController | null>(null)

const handleSubmit = async () => {
  controllerRef.current = new AbortController()
  setStatus('loading')
  try {
    const data = await generateGraph(input, controllerRef.current.signal)
    setGraph(data.graph)
    setStatus('success')
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      setStatus('idle')  // user cancelled — reset quietly
    } else {
      handleError(err)
    }
  }
}

const handleCancel = () => controllerRef.current?.abort()
```

### Pattern 7: CI/CD — GitHub Actions + Vercel + Railway

**What:** Single CI workflow handles typecheck/lint/test; separate workflows handle Vercel preview (PR) and Railway deploy (main merge).

```yaml
# .github/workflows/ci.yml — runs on every PR
name: CI
on:
  push:
    branches: ["main"]
  pull_request:
    types: [opened, synchronize]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm turbo run typecheck lint
      - name: Run Python tests (API)
        working-directory: apps/api
        run: |
          pip install uv
          uv run pytest tests/ -x
```

```yaml
# .github/workflows/deploy-preview.yml — Vercel preview on PR
name: Deploy Preview
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm add -g vercel
      - run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/web
      - run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/web
      - run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/web
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

```yaml
# .github/workflows/deploy-production.yml — Railway on merge to main
name: Deploy Production
on:
  push:
    branches: [main]

jobs:
  deploy-railway:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @railway/cli
      - run: railway up --service=api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Required GitHub secrets:**
- `VERCEL_TOKEN` — Vercel personal access token
- `VERCEL_ORG_ID` — from `vercel link` output
- `VERCEL_PROJECT_ID` — from `vercel link` output
- `RAILWAY_TOKEN` — Railway API token

**Vercel project configuration (set in Vercel dashboard):**
- Root Directory: `apps/web`
- Build Command: `turbo build` (Vercel auto-detects Turborepo, runs with filter)
- Ignored Build Step: `npx turbo-ignore --fallback=HEAD^1`

**Source:** Vercel docs (verified via WebFetch) + Turborepo GitHub Actions docs (verified via WebFetch) + Railway FastAPI docs (verified via WebFetch)

### Anti-Patterns to Avoid

- **Top-level Cytoscape import without dynamic():** `import CytoscapeComponent from 'react-cytoscapejs'` at the top of a page or layout causes `window is not defined` at build time. Always wrap in `dynamic(..., { ssr: false })`.
- **Creating a Next.js API route to proxy FastAPI:** Adds a network hop; use `rewrites` instead. API routes are needed only for logic that must run server-side (e.g., OAuth callbacks).
- **Calling `Cytoscape.use(fcose)` inside a React component body:** This runs on every render. Call it once at module top level outside the component.
- **Registering Cytoscape event listeners without a ref:** Attaching listeners inside `useEffect` without a `cyRef` leads to stale closures and duplicate listeners. Use the `cy` prop callback to capture the instance once.
- **Using `cose-bilkent` layout:** Last published 6 years ago (v4.1.0). Use `cytoscape-fcose` instead.
- **Using `pnpm add` without workspace protocol for internal packages:** Internal packages must reference each other with `"workspace:*"` not version strings, or they won't resolve from the local filesystem.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast state + component | `sonner` | Edge cases: z-index stacking, multiple concurrent toasts, auto-dismiss, accessible ARIA live regions |
| AbortController cancel | Custom promise cancellation | Native `AbortController` + `fetch signal` | Built into browser; integrates directly with fetch |
| Cytoscape React lifecycle | Manual DOM ref + `cytoscape()` imperative init | `react-cytoscapejs` `CytoscapeComponent` | Handles container resize, element diffing, style updates — non-trivial to replicate |
| Force-directed layout | Custom spring physics | `cytoscape-fcose` | Graph physics is numerically complex; fcose has 10+ years of iteration by Bilkent lab |
| CORS proxy | Next.js API route that calls FastAPI | `next.config.ts` rewrites | Zero code, no extra network hop, works identically in dev and prod |
| Monorepo task runner | Custom Makefile/scripts | `turbo` | Turborepo handles caching, parallelization, and topological ordering automatically |

**Key insight:** The graph canvas domain has a particularly deep "don't hand-roll" surface — layout algorithms, event propagation, viewport manipulation, and style diffing are all handled by Cytoscape.js. Custom code in this area always under-delivers.

---

## Common Pitfalls

### Pitfall 1: Cytoscape.js `window is not defined` in Next.js
**What goes wrong:** Build fails or page crashes with `ReferenceError: window is not defined`
**Why it happens:** Cytoscape.js (and react-cytoscapejs) accesses `window` at module load time. Next.js App Router server-renders all components, including those marked `'use client'`, which still pre-render on the server.
**How to avoid:** Use `dynamic(() => import('./GraphCanvas'), { ssr: false })`. The `'use client'` directive is necessary but NOT sufficient — `ssr: false` is also required.
**Warning signs:** Error during `next build` or `turbo build`; works in dev (`next dev`) but fails in build.

### Pitfall 2: Edge Labels vs Haystack Edge Style Conflict
**What goes wrong:** FE-01 specifies `haystack` edges for performance. CONTEXT.md locks edge labels as always visible. Haystack edges in Cytoscape.js do not render labels — the label style is silently ignored.
**Why it happens:** Haystack is the fastest curve style but is line-segment only and does not support label rotation or placement.
**How to avoid:** Use `bezier` edge curve style (supports labels with `text-rotation: autorotate`) + `hideEdgesOnViewport: true` init option (handles performance during pan/zoom). This satisfies both requirements.
**Warning signs:** Edge labels not appearing despite stylesheet being set correctly.

### Pitfall 3: Turborepo `workspace:*` Protocol Omission
**What goes wrong:** `packages/shared-types` resolves to `undefined` or a remote npm package (if one exists with that name) instead of the local package.
**Why it happens:** pnpm requires `"workspace:*"` syntax in `package.json` dependencies to resolve local packages. Without it, pnpm looks on the npm registry.
**How to avoid:** In `apps/web/package.json`: `"@graphvc/shared-types": "workspace:*"`
**Warning signs:** TypeScript errors saying the module cannot be found even after `pnpm install`.

### Pitfall 4: Vercel Monorepo Root Directory Not Set
**What goes wrong:** Vercel deploys from repo root, can't find Next.js app, build fails.
**Why it happens:** Default Vercel behavior expects Next.js at repo root.
**How to avoid:** In Vercel project settings, set Root Directory to `apps/web`. Vercel will then automatically scope `turbo build` to that app.
**Warning signs:** Vercel build logs show "No framework detected" or "next: command not found".

### Pitfall 5: Missing `transpilePackages` for Just-in-Time Internal Package
**What goes wrong:** `Cannot find module '@graphvc/shared-types'` even with correct workspace:* reference.
**Why it happens:** Next.js's bundler doesn't automatically transpile packages outside `apps/web/src` unless told to.
**How to avoid:** Add `transpilePackages: ['@graphvc/shared-types']` in `next.config.ts`.
**Warning signs:** Build error referencing the internal package name; works in IDE (TypeScript resolves it via paths) but fails in build.

### Pitfall 6: Railway 30s Request Timeout for Graph Generation
**What goes wrong:** Graph generation (GPT-4o + Neo4j write) can take 10-30+ seconds. Railway Hobby tier has a 30s request timeout.
**Why it happens:** Railway Hobby default timeout is 30 seconds.
**How to avoid:** Either upgrade to Railway Pro (configurable timeout) or ensure Railway project is on a plan with extended timeouts before Phase 2 deploy. This is a known blocker from STATE.md.
**Warning signs:** 504 Gateway Timeout on Railway in production while the same request succeeds locally.

---

## Code Examples

Verified patterns from official sources:

### Turborepo Task Pipeline with typecheck
```json
// Source: Context7 /vercel/turborepo (verified)
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "lint": {},
    "test": {},
    "dev": {
      "persistent": true,
      "cache": false
    }
  }
}
```

### Cytoscape Performance Init Options
```javascript
// Source: Context7 /cytoscape/cytoscape.js performance docs (verified)
var cy = cytoscape({
  container: document.getElementById('cy'),
  hideEdgesOnViewport: true,   // edges hidden during pan/zoom — major perf win
  textureOnViewport: true,     // texture rendering during manipulation
  pixelRatio: 1,               // FE-01 requirement — fixed pixel ratio
  wheelSensitivity: 0.5,
  // haystack is fastest but does NOT support labels — use bezier when edge labels are needed
  // elements and style defined separately
})
```

### react-cytoscapejs cy Ref Pattern for Event Listeners
```jsx
// Source: Context7 /plotly/react-cytoscapejs README (verified)
<CytoscapeComponent
  elements={elements}
  cy={(cy) => {
    // Store ref and attach all listeners here — fires once on mount
    cyRef.current = cy
    cy.on('tap', 'node', handler)
  }}
/>
```

### Next.js API Proxy via Rewrites
```typescript
// Source: Context7 /vercel/next.js rewrites docs (verified)
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
}
```

### Sequential Loading Steps State Pattern
```typescript
// Pattern for CONTEXT.md loading step labels requirement
const STEPS = [
  'Fetching URL...',
  'Extracting entities...',
  'Building graph...',
] as const

// Cycle through steps at fixed intervals during loading
useEffect(() => {
  if (status !== 'loading') return
  let i = 0
  const interval = setInterval(() => {
    i = (i + 1) % STEPS.length
    setCurrentStep(STEPS[i])
  }, 1800)
  return () => clearInterval(interval)
}, [status])
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Turbopack opt-in (`--turbo` flag) | Turbopack is default dev server in Next.js 15 | Next.js 15.0 (Oct 2024) | `next dev --turbo` is no longer needed; Turbopack is stable for dev |
| `turbo.json` `"pipeline"` key | `turbo.json` `"tasks"` key | Turborepo v2.0 (2024) | `"pipeline"` still works (backwards compat) but `"tasks"` is the current schema |
| `cose-bilkent` layout | `cytoscape-fcose` | fcose v2.0 (2021+, actively maintained) | fcose is 2x faster and actively maintained vs cose-bilkent (6 years stale) |
| Next.js Pages Router | Next.js App Router | Next.js 13+ | App Router is default in Next.js 15; Pages Router still works but not for new projects |
| Vercel auto-deploy from GitHub integration | GitHub Actions + Vercel CLI for monorepos | 2023+ | Auto-deploy from GitHub works but GitHub Actions gives fine-grained monorepo control |

**Deprecated/outdated:**
- `cose-bilkent`: v4.1.0, last published 6 years ago — use `cytoscape-fcose` instead
- `turbo.json` `"pipeline"` key: deprecated in Turborepo v2 — use `"tasks"`
- `next/dynamic` with `{ loading: () => null }` in some examples — still valid but use a proper skeleton/spinner

---

## Open Questions

1. **Railway timeout — Phase 2 deploy blocker**
   - What we know: Railway Hobby tier has 30s request timeout (from STATE.md). GPT-4o + Neo4j can take 15-35s.
   - What's unclear: Is Railway Pro the plan in use, or Hobby? What tier is currently provisioned?
   - Recommendation: Verify Railway plan tier before INFRA-03 deploy task. If Hobby, either upgrade or accept that some generations will timeout in production. Document as a known risk in the plan.

2. **FastAPI CORS — needed even with rewrites?**
   - What we know: With Next.js rewrites, browser never sees cross-origin requests. FastAPI CORS middleware is not needed for browser traffic.
   - What's unclear: Railway health checks and direct API testing (curl, Postman) will still be cross-origin unless CORS is configured on FastAPI.
   - Recommendation: Add a minimal `CORSMiddleware` to FastAPI restricted to `allowed_origins=[os.getenv("WEB_URL", "http://localhost:3000")]` for testing convenience, but it is not required for production browser traffic.

3. **GitHub Actions Python test runner — uv vs pip**
   - What we know: Phase 1 uses `uv` as the Python package manager (`uv run pytest`). CI must replicate this.
   - What's unclear: The install step in the workflow YAML needs to verify `uv` is available in the GitHub Actions runner.
   - Recommendation: Use `pip install uv` as a bootstrap step before `uv run pytest`. Alternatively use `astral-sh/setup-uv` action (official GitHub Action for uv).

---

## Sources

### Primary (HIGH confidence)
- `/vercel/turborepo` (Context7) — monorepo structure, pnpm-workspace.yaml, turbo.json tasks, internal packages, GitHub Actions workflow
- `/cytoscape/cytoscape.js` (Context7) — performance options, style API, layout config, animation, pan/zoom
- `/plotly/react-cytoscapejs` (Context7) — CytoscapeComponent props, cy ref callback pattern, stylesheet/elements/layout props
- `/vercel/next.js` (Context7) — App Router data fetching, rewrites API, dynamic import with ssr:false
- https://vercel.com/docs/monorepos/turborepo — Vercel deployment configuration (Root Directory, build command, Ignored Build Step)
- https://turborepo.dev/docs/guides/ci-vendors/github-actions — GitHub Actions CI YAML for Turborepo with pnpm
- https://docs.railway.com/guides/fastapi — Railway FastAPI Dockerfile deployment

### Secondary (MEDIUM confidence)
- https://turborepo.dev/docs/core-concepts/internal-packages — Just-in-Time vs Compiled package strategies (verified against Context7)
- https://turborepo.dev/docs/guides/frameworks/nextjs — Next.js-specific Turborepo integration notes

### Tertiary (LOW confidence)
- Multiple WebSearch results confirming `dynamic(..., { ssr: false })` as the standard Cytoscape + Next.js pattern — consistent across 5+ sources, treating as MEDIUM

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against Context7 official docs for all core libraries
- Architecture: HIGH — patterns sourced from official Turborepo and Next.js docs; Cytoscape patterns from library source
- Pitfalls: HIGH (SSR, rewrites, workspace:*) / MEDIUM (Railway timeout — from STATE.md, not researched further)
- CI/CD: HIGH — exact YAML from official Turborepo GitHub Actions docs and Vercel monorepo docs

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable libraries — 30-day estimate)
