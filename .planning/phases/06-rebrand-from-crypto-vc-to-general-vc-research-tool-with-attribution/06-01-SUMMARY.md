---
phase: 06-rebrand-from-crypto-vc-to-general-vc-research-tool-with-attribution
plan: 01
subsystem: ui
tags: [copy, branding, attribution, seo]

# Dependency graph
requires:
  - phase: 05-landing-page-observability
    provides: landing page hero section, input card, legal pages, auth pages
provides:
  - All frontend "crypto" references replaced with general VC language
  - Hero attribution subtitle linking to Yohei Nakajima's InstaGraph
  - Brand name standardized to "Instagraph" across all user-facing pages
affects: [06-02]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/web/app/layout.tsx
    - apps/web/components/landing/HeroSection.tsx
    - apps/web/components/input/InputCard.tsx
    - apps/web/app/terms/page.tsx
    - apps/web/app/privacy/page.tsx
    - apps/web/app/sign-in/[[...sign-in]]/page.tsx
    - apps/web/app/sign-up/[[...sign-up]]/page.tsx
    - apps/web/app/app/history/page.tsx

key-decisions:
  - "Brand name standardized to 'Instagraph' everywhere (not GraphVC) — aligns with InstaGraph attribution story"

patterns-established: []

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 06 Plan 01: Copy Sweep + Hero Attribution + Brand Standardization Summary

**Removed all "crypto" references from frontend copy, added InstaGraph attribution subtitle in hero, standardized brand name to "Instagraph" across auth/app pages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T05:37:07Z
- **Completed:** 2026-03-01T05:38:44Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Replaced layout metadata title and description to remove "crypto" and "GraphVC"
- Added hero attribution subtitle with link to Yohei Nakajima's InstaGraph GitHub repo
- Updated hero headline from "Map the crypto VC network in seconds" to "Map VC funding networks with knowledge graphs"
- Changed badge from "AI-powered VC graph intelligence" to "VC funding graph engine"
- Removed "crypto" from InputCard subtitle and textarea placeholder
- Removed "crypto" from terms and privacy legal pages
- Standardized nav logo from "GraphVC" to "Instagraph" on sign-in, sign-up, and history pages
- Changed error message wording from "more specific" to "more detailed"

## Task Commits

Each task was committed atomically:

1. **Task 1: Update metadata, hero section, and input card copy** - `29d844a` (feat)
2. **Task 2: Update legal pages and standardize brand name across auth/app pages** - `c9b5d42` (feat)

## Files Created/Modified
- `apps/web/app/layout.tsx` - Updated metadata title and description
- `apps/web/components/landing/HeroSection.tsx` - New badge, h1, attribution subtitle, error message
- `apps/web/components/input/InputCard.tsx` - Removed "crypto" from subtitle and placeholder
- `apps/web/app/terms/page.tsx` - Removed "crypto" from section 1
- `apps/web/app/privacy/page.tsx` - Removed "crypto" from intro paragraph
- `apps/web/app/sign-in/[[...sign-in]]/page.tsx` - Nav logo GraphVC -> Instagraph
- `apps/web/app/sign-up/[[...sign-up]]/page.tsx` - Nav logo GraphVC -> Instagraph
- `apps/web/app/app/history/page.tsx` - Nav logo GraphVC -> Instagraph

## Decisions Made
- Brand name standardized to "Instagraph" everywhere — aligns with the InstaGraph attribution story and is already used in legal pages

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 06-02 (footer restructure with attribution, community links, Solana CA) is ready to execute
- Pre-existing LandingFooter.tsx changes detected in working directory (likely prepared during planning)

## Self-Check: PASSED

All 8 modified files verified present. Both task commits (29d844a, c9b5d42) verified in git log.

---
*Phase: 06-rebrand-from-crypto-vc-to-general-vc-research-tool-with-attribution*
*Completed: 2026-03-01*
