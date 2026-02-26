---
phase: 05-landing-page-observability
plan: "02"
subsystem: ui
tags: [posthog, analytics, observability, nextjs, react]

# Dependency graph
requires:
  - phase: 02-monorepo-vertical-slice
    provides: Next.js app foundation with app/app/page.tsx handleSubmit flow

provides:
  - PostHogProvider client component in app/providers.tsx initializing posthog-js on mount
  - Root layout wrapping children in PostHogProvider for session-wide analytics
  - Typed analytics helpers in lib/analytics.ts (captureGraphGenerated, captureGraphExported, captureGraphHistoryViewed)
  - graph_generated event firing on every successful graph generation with node_count, edge_count, source_type

affects: [phase-03-auth-persistence, phase-04-export]

# Tech tracking
tech-stack:
  added: [posthog-js]
  patterns:
    - PostHog initialized in useEffect inside 'use client' component to avoid SSR window crash
    - capture_pageview: false for Next.js App Router (legacy pageview tracker misses App Router navigation)
    - analytics.ts as central typed capture helper module — only importable from client components

key-files:
  created:
    - apps/web/app/providers.tsx
    - apps/web/lib/analytics.ts
  modified:
    - apps/web/app/layout.tsx
    - apps/web/app/app/page.tsx
    - apps/web/package.json
    - pnpm-lock.yaml

key-decisions:
  - "posthog.init() in useEffect inside 'use client' PostHogProvider — mandatory to prevent SSR crash (window is not defined)"
  - "capture_pageview: false — App Router does not trigger legacy pageview detection, disabling prevents stale/double-counted data"
  - "captureGraphExported and captureGraphHistoryViewed created as stubs — no callers in Phase 5 scope; Phase 4 EXP-01/EXP-02 and Phase 3 FE-03 will wire them"
  - "source_type detection in page.tsx mirrors backend: http(s):// prefix = url, else text"

patterns-established:
  - "PostHogProvider pattern: 'use client' wrapper with useEffect-based init prevents SSR crashes for browser-only SDKs"
  - "Analytics module pattern: lib/analytics.ts as single import point for typed PostHog helpers, import only in client components"

requirements-completed: [OBS-02]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 5 Plan 02: PostHog Analytics Integration Summary

**posthog-js wired to Next.js with PostHogProvider in root layout, typed capture helpers in lib/analytics.ts, and graph_generated event firing on every successful graph generation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T06:40:45Z
- **Completed:** 2026-02-26T06:43:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- PostHogProvider client component created with 'use client' directive and useEffect-based posthog.init() to avoid SSR crash
- Root layout wraps all children in PostHogProvider providing session-wide analytics context
- lib/analytics.ts exports three typed helpers: captureGraphGenerated (active), captureGraphExported (Phase 4 stub), captureGraphHistoryViewed (Phase 3 stub)
- captureGraphGenerated fires in app/app/page.tsx handleSubmit success branch with node_count, edge_count, and source_type derived from input prefix detection

## Task Commits

Each task was committed atomically:

1. **Task 1: PostHog provider and layout integration** - `b12008a` (feat)
2. **Task 2: Analytics helpers and graph_generated event** - `9b04df4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/providers.tsx` - PostHogProvider client component; posthog.init() in useEffect with capture_pageview: false
- `apps/web/lib/analytics.ts` - Typed PostHog capture helpers; captureGraphGenerated active, captureGraphExported and captureGraphHistoryViewed as documented stubs
- `apps/web/app/layout.tsx` - Added PostHogProvider import and wraps children in PostHogProvider
- `apps/web/app/app/page.tsx` - Added captureGraphGenerated import and call in handleSubmit success branch
- `apps/web/package.json` - Added posthog-js dependency
- `pnpm-lock.yaml` - Updated lockfile for posthog-js and transitive deps

## Decisions Made

- PostHog initialized in useEffect inside 'use client' component: posthog-js accesses window/document/localStorage — calling outside browser context causes "window is not defined" SSR crash
- capture_pageview: false: Next.js App Router navigation uses client-side transitions that the legacy pageview detector misses, resulting in stale/double-counted data
- Stub helpers created now: captureGraphExported (Phase 4 EXP-01/EXP-02) and captureGraphHistoryViewed (Phase 3 FE-03) are created in Phase 5 so downstream phases can import without touching analytics.ts
- source_type mirrors backend gate: raw_input.strip().startswith('https://') determines url vs text path — same logic in frontend for consistent event attribution

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- pnpm install from within apps/web/ failed with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND for @graphvc/shared-types. Resolved by running `pnpm add posthog-js --filter web` from the monorepo root — standard pnpm workspace pattern.

## User Setup Required

PostHog requires the `NEXT_PUBLIC_POSTHOG_KEY` environment variable to be set before analytics events fire. Without it, posthog.init() will receive an empty string and events will silently fail.

Add to your deployment environment (Vercel dashboard or .env.local for local testing):
```
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
```

Get the key from: PostHog project settings > Project API Key.

## Next Phase Readiness

- Phase 3 (Auth + Persistence) can import captureGraphHistoryViewed from lib/analytics when building FE-03 history page
- Phase 4 (Export) can import captureGraphExported from lib/analytics when building EXP-01/EXP-02 export buttons
- NEXT_PUBLIC_POSTHOG_KEY env var must be set in production for events to reach PostHog

---
*Phase: 05-landing-page-observability*
*Completed: 2026-02-26*
