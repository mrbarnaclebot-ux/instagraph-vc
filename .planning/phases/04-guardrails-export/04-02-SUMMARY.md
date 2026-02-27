---
phase: 04-guardrails-export
plan: 02
subsystem: ui, api
tags: [cytoscape, export, png, json, upstash, ratelimit, redis, edge-middleware]

# Dependency graph
requires:
  - phase: 02-monorepo-vertical-slice
    provides: "GraphCanvas component with Cytoscape rendering, AppPage with graph state"
  - phase: 03-auth-persistence
    provides: "Clerk auth middleware in proxy.ts, authenticated app routes"
provides:
  - "ExportFAB component for one-click JSON and PNG graph downloads"
  - "Edge middleware IP rate limiting via @upstash/ratelimit (60 req/min)"
  - "cyRef exposure pattern from GraphCanvas via onCyInit callback"
affects: [04-guardrails-export]

# Tech tracking
tech-stack:
  added: ["@upstash/ratelimit", "@upstash/redis"]
  patterns: ["FAB overlay on canvas", "cy.png() for PNG export", "Blob + createObjectURL download", "Edge rate limiting with graceful null fallback"]

key-files:
  created:
    - "apps/web/components/graph/ExportFAB.tsx"
    - "apps/web/lib/export.ts"
  modified:
    - "apps/web/components/graph/GraphCanvas.tsx"
    - "apps/web/app/app/page.tsx"
    - "apps/web/proxy.ts"
    - "apps/web/package.json"

key-decisions:
  - "cy.png() over html-to-image for PNG export -- Cytoscape built-in, no extra dependency"
  - "Rate limiter null when UPSTASH env vars absent -- graceful dev degradation without Redis"
  - "Clerk callback routes exempt from rate limiting -- prevents SSO 429 failures"
  - "ephemeralCache on Ratelimit instance -- reduces Redis round-trips for repeat IPs"

patterns-established:
  - "ExportFAB overlay: absolute-positioned FAB buttons inside relative canvas container"
  - "onCyInit callback: parent receives cy instance without exposing internal ref"
  - "Edge rate limiting: compose Ratelimit check before auth.protect() in clerkMiddleware"

requirements-completed: [EXP-01, EXP-02, RATE-02]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 04 Plan 02: Export + Rate Limiting Summary

**One-click JSON/PNG graph export via ExportFAB component and Edge IP rate limiting (60 req/min sliding window) via @upstash/ratelimit**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T13:10:00Z
- **Completed:** 2026-02-27T13:13:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- ExportFAB component with JSON and PNG download buttons at bottom-right of graph canvas
- PNG export uses Cytoscape built-in cy.png() with gray-950 background, scale 2, maxWidth 4096
- JSON export produces cleaned/simplified format with auto-generated filename (slug + date)
- Edge middleware IP rate limiting: 60 requests/minute sliding window, 429 with Retry-After header
- Clerk auth callback routes exempt from rate limiting to prevent SSO failures
- Graceful null fallback when Upstash env vars absent (dev environments)

## Task Commits

Each task was committed atomically:

1. **Task 1: ExportFAB component + GraphCanvas cyRef exposure + export utilities** - `3ef9447` (feat)
2. **Task 2: Wire ExportFAB in AppPage + captureGraphExported analytics** - `7654610` (feat)
3. **Task 3: Edge middleware IP rate limiting in proxy.ts** - `fdf6868` (feat)

## Files Created/Modified
- `apps/web/components/graph/ExportFAB.tsx` - FAB buttons for JSON and PNG export with download logic
- `apps/web/lib/export.ts` - Export utility functions (filename generation, blob download)
- `apps/web/components/graph/GraphCanvas.tsx` - Added onCyInit callback prop to expose cy instance
- `apps/web/app/app/page.tsx` - Wired ExportFAB with cyInstance state, clears on reset
- `apps/web/proxy.ts` - IP rate limiting with @upstash/ratelimit before Clerk auth
- `apps/web/package.json` - Added @upstash/ratelimit and @upstash/redis dependencies

## Decisions Made
- Used cy.png() over html-to-image for PNG export -- Cytoscape built-in avoids extra dependency and handles full-graph capture natively
- Rate limiter set to null when UPSTASH_REDIS_REST_URL absent -- dev environments work without Redis
- Clerk callback routes (/sign-in, /sign-up, /api/webhooks) exempt from rate limiting -- prevents SSO callback 429 failures
- ephemeralCache added to Ratelimit instance -- reduces Redis round-trips for repeated IP checks within same Edge function invocation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
Environment variables needed for rate limiting in production:
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST token

Rate limiting is disabled (graceful null) when these vars are absent.

## Next Phase Readiness
- Export and rate limiting features complete
- Ready for Phase 04 Plan 03 (remaining guardrails)

---
*Phase: 04-guardrails-export*
*Completed: 2026-02-27*
