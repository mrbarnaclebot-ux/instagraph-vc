---
phase: 03-auth-persistence
plan: "05"
subsystem: ui
tags: [nextjs, supabase, clerk, react, localStorage, history, trial]

# Dependency graph
requires:
  - phase: 03-auth-persistence
    provides: Supabase graphs table schema, createSupabaseAdmin(), Clerk auth() integration, graph ownership

provides:
  - GET /api/graphs — list user's graphs ordered by created_at desc
  - DELETE /api/graphs/[id] — delete own graph with ownership check
  - PATCH /api/graphs/[id]/rename — rename graph title with ownership check
  - /app/history page — card grid (1/2/3 col), search, loading skeleton, empty state
  - HistoryCard component — inline rename, delete, navigation to /app?session=
  - lib/trial.ts — isTrialUsed/markTrialUsed with SSR typeof window guard
  - TrialModal — full-screen overlay sign-up prompt for anonymous second attempt
  - HeroSection trial gate — second anonymous submission shows TrialModal, input blocked after dismissal

affects:
  - 03-06-PLAN.md (final plan in phase — may reference history page)
  - Phase 04/05 landing page and app improvements

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Async params pattern for Next.js 15+ App Router dynamic routes (await params)"
    - "Ownership-scoped Supabase queries — double .eq('user_id', userId) on all mutations"
    - "SSR guard pattern for localStorage — typeof window === 'undefined' check"
    - "trialBlocked state to persist input-disabled state after modal dismissal"
    - "Fragment wrapper for component returning sibling modal portal"

key-files:
  created:
    - apps/web/app/api/graphs/route.ts
    - apps/web/app/api/graphs/[id]/route.ts
    - apps/web/app/api/graphs/[id]/rename/route.ts
    - apps/web/app/app/history/page.tsx
    - apps/web/components/history/HistoryCard.tsx
    - apps/web/lib/trial.ts
    - apps/web/components/auth/TrialModal.tsx
  modified:
    - apps/web/components/landing/HeroSection.tsx

key-decisions:
  - "Trial gate lives in HeroSection (client component), not page.tsx (Server Component) — trial logic requires useState and localStorage"
  - "trialBlocked separate from showTrialModal — tracks post-dismissal disabled state independently from modal visibility"
  - "Fragment wrapper (<>) used in HeroSection return to render TrialModal as sibling to <section> without a DOM wrapper"
  - "Async params in Next.js 15+ App Router — always await params before destructuring in dynamic Route Handlers"

patterns-established:
  - "Ownership check pattern: .eq('id', id).eq('user_id', userId) on all graph mutations"
  - "Inline rename pattern: isEditing state toggle, inputRef.current?.select() for pre-selection, handleRenameSubmit on blur/Enter"
  - "SSR-safe localStorage: typeof window === 'undefined' guard in utility functions"
  - "Trial gating: check isTrialUsed() before submit, call markTrialUsed() after first success"

requirements-completed: [FE-03, AUTH-02]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 3 Plan 05: Graph History and Trial Gate Summary

**Graph history page with API Route Handlers (GET/DELETE/PATCH rename), HistoryCard with inline rename, and localStorage-based anonymous trial gate with sign-up modal**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T08:23:14Z
- **Completed:** 2026-02-27T08:25:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Three ownership-checked API Route Handlers for graph listing, deletion, and renaming
- /app/history page with 1/2/3-col responsive card grid, client-side search, loading skeleton, and empty state
- HistoryCard with inline title rename (click-to-edit, Enter/blur saves, Escape cancels), delete button (hover-visible), relative timestamps, and /app?session= navigation
- Anonymous trial gate: first generation free, second attempt shows TrialModal; "Maybe Later" disables input permanently (without reload)

## Task Commits

Each task was committed atomically:

1. **Task 1: Graph history API Route Handlers (GET, DELETE, PATCH rename)** - `8850238` (feat)
2. **Task 2: History page UI, HistoryCard component, trial modal, and trial wiring** - `1efef47` (feat)

## Files Created/Modified
- `apps/web/app/api/graphs/route.ts` - GET /api/graphs — list user's graphs ordered by created_at desc
- `apps/web/app/api/graphs/[id]/route.ts` - DELETE /api/graphs/[id] — delete owned graph with ownership check
- `apps/web/app/api/graphs/[id]/rename/route.ts` - PATCH /api/graphs/[id]/rename — update title with ownership check
- `apps/web/app/app/history/page.tsx` - History page with card grid, search, loading skeleton, empty state
- `apps/web/components/history/HistoryCard.tsx` - Card with inline rename, delete, relative timestamps, nav
- `apps/web/lib/trial.ts` - isTrialUsed/markTrialUsed with SSR typeof window guard, graphvc_trial_used key
- `apps/web/components/auth/TrialModal.tsx` - Full-screen overlay with "Sign Up" (-> /sign-up) and "Maybe Later"
- `apps/web/components/landing/HeroSection.tsx` - Added trial check, markTrialUsed() after success, trialBlocked state

## Decisions Made
- Trial gate lives in HeroSection (client component), not page.tsx (Server Component) — trial logic requires useState and localStorage
- trialBlocked state is separate from showTrialModal — tracks post-dismissal disabled state independently from modal visibility, matching CONTEXT.md requirement that input stays disabled after "Maybe Later"
- Fragment wrapper used in HeroSection return to render TrialModal as sibling to the main section without adding a DOM wrapper div
- Async params pattern used in all dynamic Route Handlers — Next.js 15+ App Router requires awaiting params before destructuring

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `apps/web/components/graph/cytoscapeStyles.ts` (shadow-blur, font-weight types) — out of scope for this plan, pre-dating these changes

## User Setup Required

None - no external service configuration required. All new API routes use existing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and Clerk environment variables.

## Next Phase Readiness
- Graph history feature is complete — authenticated users can browse, search, rename, and delete their saved graphs
- Anonymous trial gate is wired to the landing page HeroSection
- Plan 06 (final plan in Phase 3) can proceed — Phase 3 feature set is functionally complete
- /app/history is behind the auth proxy (proxy.ts) so only authenticated users can access it

---
*Phase: 03-auth-persistence*
*Completed: 2026-02-27*
