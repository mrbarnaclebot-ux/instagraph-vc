---
phase: 02-monorepo-vertical-slice
plan: 03
subsystem: ui
tags: [fetch, abort-controller, radix-ui, tailwind, input-form, loading-state, error-handling]

# Dependency graph
requires:
  - phase: 02-monorepo-vertical-slice
    provides: apps/web skeleton with @graphvc/shared-types (GenerateResponse, APIError types) and @radix-ui/react-tabs pre-installed
provides:
  - Typed generateGraph() fetch wrapper with AbortSignal and GraphAPIError (isScrapeFailure getter)
  - LoadingSteps overlay cycling "Fetching URL..." → "Extracting entities..." → "Building graph..." with Cancel button
  - InputCard hero component with URL/Text tab toggle, collapsible-to-compact-bar state, and submit handler
affects: [02-04-app-wiring, 03-graph-canvas-query]

# Tech tracking
tech-stack:
  added: [@radix-ui/react-tabs, sonner]
  patterns: [AbortController signal threading through fetch, isScrapeFailure getter for FE-05 toast routing, controlled collapse via collapsed prop]

key-files:
  created:
    - apps/web/lib/api.ts
    - apps/web/components/input/LoadingSteps.tsx
    - apps/web/components/input/InputCard.tsx
  modified: []

key-decisions:
  - "GraphAPIError class extends Error with isScrapeFailure getter — FE-05 toast routing determined at the error class level, not in page logic"
  - "InputCard takes collapsed prop from parent — parent (page) owns collapsed state, InputCard is pure controlled component"
  - "AbortController signal passed into generateGraph() — cancellation wired at API layer"
  - "LoadingSteps cycling at 1800ms intervals — matches CONTEXT.md specification"

patterns-established:
  - "API client pattern: GraphAPIError class with isScrapeFailure getter for error classification"
  - "Controlled input pattern: InputCard is fully controlled (collapsed, disabled props from parent)"
  - "Loading overlay pattern: LoadingSteps as separate component, parent passes onCancel, renders above canvas"

requirements-completed: [FE-05]

# Metrics
duration: ~8min
completed: 2026-02-26
---

# Phase 2 Plan 03: API Client + Input UI + Loading Steps Summary

**Typed fetch client with GraphAPIError/isScrapeFailure, hero InputCard with URL/Text tabs and collapsible state, and LoadingSteps overlay cycling FE-05-compliant step labels with AbortController cancel**

## Performance

- **Duration:** ~8 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `lib/api.ts` — `GraphAPIError` class with `isScrapeFailure` getter detecting scrape failures for FE-05 toast routing; `generateGraph()` typed fetch to `/api/generate` with `AbortSignal`
- `LoadingSteps.tsx` — cycling step labels ("Fetching URL..." → "Extracting entities..." → "Building graph...") at 1800ms, Cancel button calling `onCancel` prop
- `InputCard.tsx` — URL/Text tab toggle via `@radix-ui/react-tabs`, hero expanded layout (max-w-2xl centered), collapses to compact top bar with "New" button; fully controlled via `collapsed`/`disabled` props

## Task Commits

Each task was committed atomically:

1. **Task 1: lib/api.ts — typed generateGraph() fetch wrapper** - `3346121` (feat)
2. **Task 2: LoadingSteps overlay** - `110e649` (feat)
3. **Task 3: InputCard hero input** - `206b74c` (feat)

## Files Created/Modified

- `apps/web/lib/api.ts` — `GraphAPIError` (status + detail, `isScrapeFailure` getter) + `generateGraph(input, signal)` typed fetch wrapper
- `apps/web/components/input/LoadingSteps.tsx` — sequential label cycling with `setInterval`, Cancel button with `onCancel` prop
- `apps/web/components/input/InputCard.tsx` — `@radix-ui/react-tabs` URL/Text toggle, hero expanded + compact collapsed states, `onSubmit(input, isUrl)` callback

## Decisions Made

- `isScrapeFailure` getter lives on `GraphAPIError` class (not in page) — keeps FE-05 error routing at the boundary where the error originates
- `InputCard` is a pure controlled component — `collapsed` and `disabled` are props, page owns state
- Placeholder text exact match: "Paste a funding announcement, blog post, or article about a crypto VC deal..." — matches CONTEXT.md lock

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- API client + input components ready for page wiring in Plan 02-04
- `generateGraph(input: string, signal: AbortSignal): Promise<GenerateResponse>` — throws `GraphAPIError` on non-2xx
- `InputCard` interface: `{ collapsed, disabled, onSubmit(input, isUrl), onExpand }`
- `LoadingSteps` interface: `{ onCancel }` — renders as full overlay, parent controls when to mount/unmount

---
*Phase: 02-monorepo-vertical-slice*
*Completed: 2026-02-26*
