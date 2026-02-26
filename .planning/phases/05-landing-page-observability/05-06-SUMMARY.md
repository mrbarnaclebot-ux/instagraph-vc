---
phase: 05-landing-page-observability
plan: "06"
subsystem: ui
tags: [react, nextjs, cytoscape, dynamic-import, landing-page, graph-render]

# Dependency graph
requires:
  - phase: 05-landing-page-observability
    provides: HeroSection component with anonymous trial form
  - phase: 02-monorepo-vertical-slice
    provides: GraphCanvas with fcose layout and dynamic() ssr:false pattern
provides:
  - HeroSection that renders live VCGraph in right column after successful /api/generate call
  - Dynamic GraphCanvas import with ssr:false in landing page context
  - UAT Gap 2 closure — graph generation visually renders on landing page
affects: [future-uat, phase-03-auth]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "dynamic() with ssr:false for GraphCanvas on landing page (same pattern as app/app/page.tsx)"
    - "VCGraph | null state replaces primitive { nodes, edges } result state"
    - "Right column loading spinner during extraction — visual affordance without blocking left form"

key-files:
  created: []
  modified:
    - apps/web/components/landing/HeroSection.tsx

key-decisions:
  - "Sign up to save caption placed as right-column footer beneath graph (not inline in left form) — graph context makes the prompt more meaningful"
  - "Loading spinner shown in right column during extraction — keeps DemoGraph hidden while fetching to avoid jarring flash"
  - "Border transitions to indigo on success state — purposeful visual feedback without generic glow effects"
  - "onNodeClick={() => undefined} passed to GraphCanvas — landing page has no detail panel; no-op is correct and type-safe"

patterns-established:
  - "Pattern: Landing page GraphCanvas follows exact same dynamic import pattern as authenticated app"

requirements-completed: [FE-04]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 05 Plan 06: HeroSection GraphCanvas Render Summary

**HeroSection now stores VCGraph state and renders live Cytoscape graph in the right column after /api/generate succeeds, with DemoGraph as default and a Sign up caption beneath the result**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T17:40:01Z
- **Completed:** 2026-02-26T17:45:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Replaced `{ nodes, edges }` result state with `VCGraph | null` graph state — full data available for rendering
- Added dynamic import of GraphCanvas with `ssr:false` — SSR-safe, follows Phase 02-04 established pattern
- Right column now renders live interactive Cytoscape graph on successful API call, DemoGraph in default state
- Loading spinner shown in right column during extraction (purposeful, non-blocking)
- Border on graph container transitions to indigo on success — subtle but meaningful visual feedback
- Sign up to save prompt displayed as caption beneath result graph with node and edge counts
- Removed left-column text badge (`result &&` block) — graph itself communicates success
- TypeScript compiles cleanly (exit code 0, zero errors for HeroSection)
- UAT Gap 2 closed: submitting text in hero form now visually renders the generated graph

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite HeroSection to store VCGraph and render GraphCanvas on success** - `d713718` (feat)
2. **Task 2: Verify TypeScript compiles cleanly** - verification only, no code change, no commit needed

## Files Created/Modified
- `apps/web/components/landing/HeroSection.tsx` - Rewritten: VCGraph state, dynamic GraphCanvas, right-column live render, loading spinner, success caption, removed text badge

## Decisions Made
- Loading spinner occupies the right column during extraction rather than showing DemoGraph — avoids jarring replacement when graph appears; cleaner UX
- Border color transition (`border-gray-800` to `border-indigo-700/60` + shadow) communicates result availability without generic gradient aesthetics
- `onNodeClick={() => undefined}` is correct and type-safe for landing page context (no detail panel)
- Sign up caption uses `graph.nodes.length` and `graph.edges.length` directly from VCGraph state — single source of truth

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - UX Enhancement] Added right-column loading spinner during extraction**
- **Found during:** Task 1 (HeroSection rewrite)
- **Issue:** Plan spec had no loading state for the right column — without it, DemoGraph would show during the API call, then be replaced abruptly by GraphCanvas when the response arrives. This creates a jarring experience.
- **Fix:** Added a spinner shown when `isLoading && !graph` in the right column, hiding DemoGraph during extraction
- **Files modified:** apps/web/components/landing/HeroSection.tsx
- **Verification:** Logic verified — spinner shows while loading, GraphCanvas shows on success, DemoGraph shows in default state
- **Committed in:** d713718 (Task 1 commit)

---

**Total deviations:** 1 auto-added (UX enhancement for correct transition behavior)
**Impact on plan:** Enhancement improves UX without scope creep; all plan requirements met.

## Issues Encountered
None — TypeScript compiled cleanly on first run, all patterns matched established Phase 02-04 decisions.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT Gap 2 is closed: the hero anonymous trial now visually renders a graph
- Phase 5 is now complete (all 6 plans executed)
- UAT can be re-run to confirm both gaps are closed
- Phase 3 (AUTH-02 modal) will replace the sign-up caption with a modal trigger when implemented

---
*Phase: 05-landing-page-observability*
*Completed: 2026-02-26*
