---
phase: 03-auth-persistence
plan: "03"
subsystem: auth
tags: [clerk, nextjs, oauth, google, bearer-token, jwt, react-hooks]

# Dependency graph
requires:
  - phase: 03-01
    provides: "@clerk/nextjs installed, ClerkProvider in layout, proxy.ts auth guard active"
provides:
  - "Custom sign-in page at /sign-in/[[...sign-in]] with Clerk <SignIn /> component (dark theme)"
  - "Custom sign-up page at /sign-up/[[...sign-up]] with Clerk <SignUp /> component (dark theme)"
  - "generateGraph() accepts optional getToken parameter and attaches Authorization: Bearer header"
  - "AppPage uses useAuth().getToken() and passes token to every API call"
affects:
  - 03-auth-persistence
  - 04-graph-persistence

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Clerk catch-all route pattern [[...sign-in]] for OAuth SSO callback support"
    - "Optional getToken parameter pattern — anonymous callers pass null, authenticated pass getToken from useAuth()"
    - "Spread operator for conditional Authorization header: ...(token ? { Authorization: Bearer token } : {})"

key-files:
  created:
    - "apps/web/app/sign-in/[[...sign-in]]/page.tsx"
    - "apps/web/app/sign-up/[[...sign-up]]/page.tsx"
  modified:
    - "apps/web/lib/api.ts"
    - "apps/web/app/app/page.tsx"

key-decisions:
  - "Catch-all slug [[...sign-in]] required (not flat page.tsx) — Clerk Google OAuth redirects to /sign-in/sso-callback which 404s without catch-all"
  - "getToken parameter optional (not required) in generateGraph — preserves backward compatibility for anonymous/unauthenticated callers"
  - "Bearer header only attached when token is non-null — server gracefully handles missing auth via dev_skip_auth flag"
  - "getToken added to handleSubmit useCallback dependency array — required for React exhaustive-deps correctness"

patterns-established:
  - "Clerk catch-all route: pages that handle OAuth redirects must use [[...slug]]/page.tsx pattern"
  - "API token injection: pass getToken from useAuth() as optional parameter through function chain, never fetch token at call site"

requirements-completed: [AUTH-01]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 3 Plan 03: Clerk Sign-In/Sign-Up Pages + Bearer Token Summary

**Clerk <SignIn /> and <SignUp /> catch-all pages with Google OAuth support, and Bearer token attached to all generateGraph API calls via useAuth().getToken()**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T08:18:33Z
- **Completed:** 2026-02-27T08:20:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced flat sign-in/sign-up page stubs with Clerk catch-all routes that support Google OAuth `/sso-callback` redirects
- Applied consistent dark theme appearance overrides (gray-900 card, indigo accents) to both Clerk components
- Wired `useAuth().getToken()` through `generateGraph()` — all authenticated API calls now include `Authorization: Bearer <jwt>` header

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace sign-in/sign-up stubs with Clerk catch-all pages** - `2f3bc65` (feat)
2. **Task 2: Wire Bearer token to API calls (lib/api.ts + app/page.tsx)** - `9f0db62` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `apps/web/app/sign-in/[[...sign-in]]/page.tsx` - Clerk SignIn component with dark theme, replaces old stub
- `apps/web/app/sign-up/[[...sign-up]]/page.tsx` - Clerk SignUp component with dark theme, replaces old stub
- `apps/web/lib/api.ts` - generateGraph now accepts optional getToken, attaches Authorization: Bearer header
- `apps/web/app/app/page.tsx` - Imports useAuth, passes getToken to generateGraph on every submit

## Decisions Made
- Catch-all slug `[[...sign-in]]` is required for Clerk Google OAuth — without it, `/sign-in/sso-callback` returns 404
- `getToken` parameter is optional (`() => Promise<string | null> | null`) — preserves backward compatibility
- Bearer header is only set when token is non-null — safe for both authenticated and anonymous users
- `getToken` added to `handleSubmit` useCallback dependency array for React exhaustive-deps correctness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `apps/web/components/graph/cytoscapeStyles.ts` (shadow-blur, FontWeight, round-rectangle type mismatches) — these pre-existed before this plan and are unrelated to auth changes. Logged to `deferred-items.md` in phase directory. Not fixed (out of scope per deviation rules).

## User Setup Required

None - no external service configuration required for this plan. Clerk keys must be configured per plan 03-01.

## Next Phase Readiness
- Sign-in and sign-up flows are wired to Clerk — users can authenticate with Google OAuth
- All `generateGraph` calls carry Bearer tokens when user is authenticated
- FastAPI backend validates Bearer tokens via PyJWT + JWKS (plan 01-04)
- Ready for plan 03-04: graph persistence (saving graphs to Supabase per authenticated user)

---
*Phase: 03-auth-persistence*
*Completed: 2026-02-27*

## Self-Check: PASSED

- FOUND: apps/web/app/sign-in/[[...sign-in]]/page.tsx
- FOUND: apps/web/app/sign-up/[[...sign-up]]/page.tsx
- FOUND: apps/web/lib/api.ts
- FOUND: apps/web/app/app/page.tsx
- CONFIRMED: old sign-in/page.tsx stub deleted
- CONFIRMED: old sign-up/page.tsx stub deleted
- FOUND commit: 2f3bc65 (Task 1)
- FOUND commit: 9f0db62 (Task 2)
