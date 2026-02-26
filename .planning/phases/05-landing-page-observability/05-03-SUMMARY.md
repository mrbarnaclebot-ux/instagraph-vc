---
phase: 05-landing-page-observability
plan: "03"
subsystem: ui

tags: [react, nextjs, cytoscape, fcose, tailwind, landing-page]

# Dependency graph
requires:
  - phase: 02-monorepo-vertical-slice
    provides: GraphCanvas.tsx pattern (dynamic ssr:false import), cytoscapeStyles.ts with entity-type styling, fcose layout setup

provides:
  - DemoGraph.tsx: dynamic import wrapper (ssr:false) + DEMO_GRAPH_DATA with 8 fictional VC nodes/7 edges
  - DemoGraphCanvas.tsx: Cytoscape canvas with fcose animate 800ms, reuses cytoscapeStylesheet
  - LandingNav.tsx: sticky dark nav, Instagraph logo left, auth-aware CTA right
  - HeroSection.tsx: split lg:grid-cols-2 hero, anonymous trial textarea, inline sign-up prompt after success

affects:
  - 05-landing-page-observability (remaining plans: landing page assembly)
  - Phase 3 AUTH-02 (modal integration point documented in HeroSection.tsx comment)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic ssr:false pattern applied to DemoGraphCanvas (same as GraphCanvas in app)"
    - "Cytoscape.use(fcose) at module level outside component — prevents re-registration on re-render"
    - "DEMO_GRAPH_DATA exported from DemoGraph.tsx for potential reuse by other landing components"

key-files:
  created:
    - apps/web/components/landing/DemoGraph.tsx
    - apps/web/components/landing/DemoGraphCanvas.tsx
    - apps/web/components/landing/LandingNav.tsx
    - apps/web/components/landing/HeroSection.tsx
  modified: []

key-decisions:
  - "DEMO_GRAPH_DATA lives in DemoGraph.tsx (wrapper), not DemoGraphCanvas.tsx — keeps data accessible without triggering SSR import of Cytoscape"
  - "Post-trial sign-up prompt is inline text only (Phase 5 interim) — AUTH-02 modal integration deferred to Phase 3, comment in HeroSection.tsx documents the handoff point"
  - "DemoGraph right column hidden on mobile (hidden lg:block) — canvas requires sufficient viewport width for readability"

patterns-established:
  - "Landing components live in apps/web/components/landing/ — separate from app components in apps/web/components/graph/"

requirements-completed: [FE-04]

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 05 Plan 03: Landing Page Foundation Components Summary

**Interactive Cytoscape demo graph canvas (fcose 800ms animate) + split hero layout with anonymous trial textarea — landing page visual foundation complete**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T06:40:55Z
- **Completed:** 2026-02-26T06:44:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- DemoGraph dynamic wrapper (ssr:false) with DEMO_GRAPH_DATA (8 nodes: 2 Investors, 2 Projects, 1 Round, 2 Narratives, 1 Person) and 7 edges
- DemoGraphCanvas Cytoscape render reusing cytoscapeStylesheet (visual consistency with app) and fcose animationDuration: 800
- LandingNav sticky dark nav with Instagraph logo and auth-aware CTA (Sign In / Go to app)
- HeroSection split grid layout with outcome-led headline, anonymous trial textarea + submit, DemoGraph in right column above the fold

## Task Commits

Each task was committed atomically:

1. **Task 1: DemoGraph canvas components** - `826c500` (feat)
2. **Task 2: Landing nav and hero section** - `f409a69` (feat)

**Plan metadata:** _(docs commit below)_

## Files Created/Modified
- `apps/web/components/landing/DemoGraph.tsx` - Dynamic import wrapper (ssr:false) + DEMO_GRAPH_DATA constant
- `apps/web/components/landing/DemoGraphCanvas.tsx` - CytoscapeComponent with fcose animate, cytoscapeStylesheet reuse, module-level fcose registration
- `apps/web/components/landing/LandingNav.tsx` - Sticky nav: Instagraph logo left, auth-aware Sign In / Go to app right
- `apps/web/components/landing/HeroSection.tsx` - Split lg:grid-cols-2 hero with headline, anonymous trial form, DemoGraph right column

## Decisions Made
- DEMO_GRAPH_DATA exported from DemoGraph.tsx (outer wrapper) rather than DemoGraphCanvas.tsx — keeps data available at module level without triggering Cytoscape's window dependency during SSR
- Post-trial inline "Sign up to save" prompt (not modal, not redirect) documented with AUTH-02 Phase 3 deferral comment — Phase 3 will replace the block with a modal trigger
- DemoGraph right column hidden on mobile (hidden lg:block) per plan spec — consistent with context decision to show split layout on desktop only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing `Cannot find module 'next/*'` TypeScript errors exist in the project environment (affecting existing files like `app/app/page.tsx` as well). These are environment-level TSC module resolution issues unrelated to the new landing components. The new landing components have zero TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Landing component foundation complete: DemoGraph + DemoGraphCanvas + LandingNav + HeroSection
- Remaining Phase 5 plans can assemble these into the full landing page route
- AUTH-02 modal integration point is documented in HeroSection.tsx for Phase 3

---
*Phase: 05-landing-page-observability*
*Completed: 2026-02-26*
