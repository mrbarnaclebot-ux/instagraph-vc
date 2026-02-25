---
phase: 02-monorepo-vertical-slice
plan: 01
subsystem: infra
tags: [pnpm, turborepo, next.js, typescript, monorepo, cytoscape, tailwind]

# Dependency graph
requires:
  - phase: 01-backend-foundation
    provides: FastAPI POST /api/generate endpoint with GenerateResponse schema at localhost:8000
provides:
  - pnpm workspace covering apps/* and packages/*
  - Turborepo task pipeline (build, dev, typecheck, lint, test)
  - "@graphvc/shared-types JIT package with 8 TypeScript types mirroring FastAPI schemas"
  - Next.js 16 app at apps/web with App Router, Tailwind, dark mode, Sonner toasts
  - /api/* rewrite proxy to localhost:8000 (or NEXT_PUBLIC_API_URL)
  - transpilePackages config for @graphvc/shared-types
affects:
  - 02-02-graph-api-client
  - 02-03-input-form
  - 02-04-graph-canvas

# Tech tracking
tech-stack:
  added:
    - turbo@2.8.11 (root devDependency)
    - pnpm workspaces (pnpm-workspace.yaml)
    - next@16.1.6 (Next.js, React 19)
    - "@graphvc/shared-types (internal JIT package)"
    - cytoscape@^3.0.0
    - react-cytoscapejs@^2.0.0
    - cytoscape-fcose@^2.0.0
    - sonner (toast notifications)
    - "@radix-ui/react-tabs"
  patterns:
    - JIT internal package strategy — no build step, Next.js Turbopack resolves TypeScript source directly via exports map
    - pnpm workspace:* protocol for internal package references (not version strings)
    - transpilePackages required in next.config.ts for JIT packages
    - Turborepo "tasks" key (not deprecated "pipeline") for v2 compatibility

key-files:
  created:
    - pnpm-workspace.yaml
    - turbo.json
    - package.json (root)
    - packages/shared-types/package.json
    - packages/shared-types/src/index.ts
    - apps/web/package.json
    - apps/web/next.config.ts
    - apps/web/app/layout.tsx
    - apps/web/app/page.tsx
    - apps/web/app/app/page.tsx
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "JIT (Just-in-Time) shared-types strategy chosen — no build step, Next.js Turbopack compiles TypeScript source directly; requires transpilePackages in next.config.ts"
  - "workspace:* protocol is required for pnpm internal packages — version strings cause pnpm to attempt npm registry resolution"
  - "turbo.json uses 'tasks' key not 'pipeline' — pipeline is deprecated in Turborepo v2"
  - "NEXT_PUBLIC_API_URL env var with localhost:8000 default — enables production override without code changes"

patterns-established:
  - "JIT internal package: package.json exports map points to ./src/index.ts, no compile step needed"
  - "API proxy: /api/:path* rewrites to ${NEXT_PUBLIC_API_URL}/api/:path* — all frontend API calls go through Next.js proxy"

requirements-completed: [INFRA-03]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 2 Plan 01: Monorepo Foundation Summary

**Turborepo monorepo with pnpm workspaces, @graphvc/shared-types JIT package (8 types mirroring FastAPI schemas), and Next.js 16 skeleton with /api/* rewrite proxy to FastAPI at localhost:8000**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-25T17:31:41Z
- **Completed:** 2026-02-25T17:35:31Z
- **Tasks:** 3
- **Files modified:** 21

## Accomplishments

- pnpm-workspace.yaml + turbo.json establish monorepo foundation that all Phase 2 UI plans depend on
- @graphvc/shared-types exports 8 TypeScript types (EntityType, RelationshipType, GraphNode, GraphEdge, VCGraph, GenerateMeta, GenerateResponse, APIError) matching FastAPI schemas exactly
- Next.js 16 app scaffolded with App Router, Tailwind, dark mode (bg-gray-950), Sonner toasts, and /api/* proxy rewrite

## Task Commits

Each task was committed atomically:

1. **Task 1: Turborepo root config — pnpm workspace, turbo.json, root package.json** - `6f923f6` (chore)
2. **Task 2: packages/shared-types — TypeScript types mirroring FastAPI generate schemas** - `969eb2c` (feat)
3. **Task 3: Next.js 15 skeleton at apps/web with API rewrites and workspace dependency** - `3d4a647` (feat)

## Files Created/Modified

- `pnpm-workspace.yaml` — pnpm workspace definition covering apps/* and packages/*
- `turbo.json` — Turborepo v2 task pipeline with build/dev/typecheck/lint/test tasks
- `package.json` (root) — turbo run scripts, packageManager field
- `packages/shared-types/package.json` — JIT package definition, exports map to ./src/index.ts
- `packages/shared-types/src/index.ts` — 8 TypeScript types mirroring apps/api/app/generate/schemas.py
- `apps/web/package.json` — Next.js deps + workspace:* reference to @graphvc/shared-types + cytoscape stack
- `apps/web/next.config.ts` — transpilePackages for @graphvc/shared-types, /api/* rewrite to localhost:8000
- `apps/web/app/layout.tsx` — GraphVC metadata, dark mode, Sonner Toaster
- `apps/web/app/page.tsx` — redirect('/app')
- `apps/web/app/app/page.tsx` — placeholder for Plan 02-04 graph workspace
- `pnpm-lock.yaml` — updated with all workspace dependencies

## Decisions Made

- **JIT internal package strategy:** packages/shared-types uses no build step — `exports` map points to `./src/index.ts`. Next.js Turbopack resolves the TypeScript source directly. Requires `transpilePackages: ['@graphvc/shared-types']` in next.config.ts.
- **workspace:* protocol:** Required for pnpm workspace links. Version strings (e.g., "0.0.1") would cause pnpm to look on npm registry and fail.
- **turbo.json "tasks" key:** "pipeline" key is deprecated in Turborepo v2; using "tasks" ensures compatibility with turbo@2.x.
- **NEXT_PUBLIC_API_URL default:** next.config.ts uses `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'` — works in dev without .env.local, overridable for production.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — pnpm install succeeded cleanly, @graphvc/shared-types symlinked correctly in apps/web/node_modules/@graphvc/.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- pnpm workspace ready: `pnpm install` from root resolves all packages
- `@graphvc/shared-types` importable from apps/web via workspace:* link
- Next.js dev server can start with `pnpm --filter apps/web dev` (port 3000)
- /api/generate proxy ready — requests to localhost:3000/api/generate rewrite to localhost:8000/api/generate
- Plans 02-02, 02-03, 02-04 can now proceed (this is their depends_on target)

---
*Phase: 02-monorepo-vertical-slice*
*Completed: 2026-02-25*

## Self-Check: PASSED

All files verified present. All commits verified in git log.
- pnpm-workspace.yaml: FOUND
- turbo.json: FOUND
- package.json: FOUND
- packages/shared-types/package.json: FOUND
- packages/shared-types/src/index.ts: FOUND
- apps/web/package.json: FOUND
- apps/web/next.config.ts: FOUND
- apps/web/app/layout.tsx: FOUND
- apps/web/app/page.tsx: FOUND
- apps/web/app/app/page.tsx: FOUND
- Commit 6f923f6: FOUND
- Commit 969eb2c: FOUND
- Commit 3d4a647: FOUND
