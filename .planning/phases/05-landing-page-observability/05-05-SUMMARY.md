---
phase: 05-landing-page-observability
plan: "05"
subsystem: ui
tags: [posthog, analytics, react, nextjs]

# Dependency graph
requires:
  - phase: 05-landing-page-observability
    provides: PostHogProvider component wired into Next.js App Router layout
provides:
  - PostHogProvider with conditional posthog.init() guard — no console.error when NEXT_PUBLIC_POSTHOG_KEY absent
affects: [observability, analytics]

# Tech tracking
tech-stack:
  added: []
  patterns: [env-var-truthiness-guard for optional third-party SDKs]

key-files:
  created: []
  modified:
    - apps/web/app/providers.tsx

key-decisions:
  - "Truthiness check (not !== undefined) — also filters empty string '', which posthog would reject the same way as undefined"
  - "Non-null assertion (!) removed — TypeScript narrows to string inside the if block, making ! redundant"

patterns-established:
  - "Guard optional SDK init behind if (process.env.NEXT_PUBLIC_KEY) to prevent console noise in dev/CI"

requirements-completed: [OBS-02]

# Metrics
duration: 1min
completed: 2026-02-26
---

# Phase 5 Plan 05: PostHog Init Guard Summary

**Conditional env-var guard added to posthog.init() — silences "initialized without a token" console.error when NEXT_PUBLIC_POSTHOG_KEY is absent**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-26T17:39:48Z
- **Completed:** 2026-02-26T17:40:45Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Wrapped `posthog.init()` in `if (process.env.NEXT_PUBLIC_POSTHOG_KEY)` truthiness check
- Removed TypeScript non-null assertion `!` — type narrowed inside the conditional block
- Closes UAT Gap 1: no more noisy `console.error` on page load in dev/CI without the key set
- PostHog initializes normally when the key is present (logic inside guard unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add conditional guard to posthog.init()** - `85122ef` (fix)

## Files Created/Modified

- `apps/web/app/providers.tsx` - posthog.init() wrapped in env-var truthiness guard; ! operator removed

## Decisions Made

- Truthiness check `if (process.env.NEXT_PUBLIC_POSTHOG_KEY)` used instead of `!== undefined` — also filters empty string `''` which PostHog would reject the same way
- TypeScript non-null assertion `!` removed — string is narrowed to a defined non-empty value inside the if block, making `!` both redundant and misleading

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 is now complete — all 5 plans executed
- UAT Gap 1 (PostHog console.error) and UAT Gap 2 (hero graph render) addressed by plans 05-05 and 05-06
- Landing page with Sentry error tracking, PostHog analytics, and full vertical slice ready for production deploy

---
*Phase: 05-landing-page-observability*
*Completed: 2026-02-26*
