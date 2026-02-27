---
phase: 03-auth-persistence
plan: "01"
subsystem: auth
tags: [clerk, nextjs, middleware, csp, oauth, authentication]

# Dependency graph
requires: []
provides:
  - "@clerk/nextjs@6.38.0 installed in apps/web"
  - "proxy.ts auth guard protecting all /app/* routes via clerkMiddleware"
  - "ClerkProvider wrapping root layout (outside PostHogProvider)"
  - "CSP updated with Clerk frontend API, img.clerk.com, and challenges.cloudflare.com"
affects:
  - 03-auth-persistence (plans 02+)
  - All Next.js pages requiring auth state

# Tech tracking
tech-stack:
  added: ["@clerk/nextjs@6.38.0"]
  patterns:
    - "proxy.ts (not middleware.ts) for Next.js 16 auth middleware"
    - "createRouteMatcher for public/private route segmentation"
    - "ClerkProvider outside <html> element wrapping entire React tree"
    - "Dynamic CSP using NEXT_PUBLIC_CLERK_FRONTEND_API env var"

key-files:
  created:
    - "apps/web/proxy.ts"
  modified:
    - "apps/web/package.json"
    - "apps/web/app/layout.tsx"
    - "apps/web/next.config.ts"
    - "pnpm-lock.yaml"

key-decisions:
  - "Use proxy.ts not middleware.ts — Next.js 16.1.6 uses proxy.ts; middleware.ts is silently ignored"
  - "ClerkProvider wraps outside <html> element — required placement for Clerk context to work in Server Components"
  - "CSP Clerk domains sourced from NEXT_PUBLIC_CLERK_FRONTEND_API env var — dynamically injected at build/runtime so dev and prod instances are handled correctly"
  - "Public routes include /api/webhooks/(.*) — Clerk webhook endpoint has no Clerk session, must be public"

patterns-established:
  - "proxy.ts pattern: import clerkMiddleware + createRouteMatcher, call auth.protect() for all non-public routes"
  - "CSP env-driven pattern: conditional template literals using clerkFrontendApi ?? '' for graceful no-env fallback"

requirements-completed: [AUTH-01]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 3 Plan 01: Clerk Installation and Auth Guard Summary

**@clerk/nextjs@6.38.0 installed with proxy.ts auth guard protecting /app/* routes, ClerkProvider in root layout, and CSP updated for all Clerk domains**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T01:51:54Z
- **Completed:** 2026-02-27T01:53:54Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed @clerk/nextjs@6.38.0 via pnpm monorepo filter from root
- Created apps/web/proxy.ts with clerkMiddleware protecting all non-public routes (/, /sign-in/*, /sign-up/*, /privacy/*, /terms/*, /api/webhooks/* are public)
- Wrapped root layout in ClerkProvider outside the html element, preserving PostHogProvider nesting
- Updated CSP in next.config.ts to include Clerk frontend API in script-src and connect-src, img.clerk.com in img-src, and challenges.cloudflare.com in frame-src

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @clerk/nextjs and create proxy.ts auth guard** - `b137e74` (feat)
2. **Task 2: Wrap layout in ClerkProvider and update CSP for Clerk domains** - `4a490e4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/proxy.ts` - clerkMiddleware auth guard for Next.js 16; protects all non-public routes via auth.protect()
- `apps/web/package.json` - Added @clerk/nextjs@6.38.0 dependency
- `apps/web/app/layout.tsx` - ClerkProvider wrapping html element (outside PostHogProvider)
- `apps/web/next.config.ts` - CSP updated with Clerk domains (NEXT_PUBLIC_CLERK_FRONTEND_API in script-src/connect-src, img.clerk.com in img-src, challenges.cloudflare.com in frame-src)
- `pnpm-lock.yaml` - Updated with @clerk/nextjs and its dependencies

## Decisions Made
- **proxy.ts not middleware.ts:** Next.js 16 uses proxy.ts for middleware. Using middleware.ts would be silently ignored, leaving auth guard completely inactive.
- **ClerkProvider placement:** Goes outside `<html>` element. This is Clerk's required placement for context availability throughout the entire React Server Component tree.
- **Dynamic CSP via env var:** NEXT_PUBLIC_CLERK_FRONTEND_API allows the same config to work across Clerk dev instances (clerk.accounts.dev) and prod instances (clerk.your-domain.com) without code changes.
- **pnpm filter from root:** `pnpm --filter web add @clerk/nextjs@6.38.0` required instead of `cd apps/web && pnpm add` — running from within the workspace directory fails with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND for `@graphvc/shared-types@workspace:*`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pnpm install command fixed to run from monorepo root**
- **Found during:** Task 1 (Install @clerk/nextjs)
- **Issue:** Plan specified `cd apps/web && pnpm add @clerk/nextjs@6.38.0` but this fails with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND because @graphvc/shared-types@workspace:* cannot be resolved when running pnpm from inside the workspace directory
- **Fix:** Used `pnpm --filter web add @clerk/nextjs@6.38.0` from the monorepo root instead
- **Files modified:** apps/web/package.json, pnpm-lock.yaml (same result, different install path)
- **Verification:** @clerk/nextjs@6.38.0 appears in apps/web/package.json dependencies
- **Committed in:** b137e74 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was minimal — same outcome, different command path. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in `components/graph/cytoscapeStyles.ts` (shadow-blur property, FontWeight type mismatches) — these are out of scope, not introduced by this plan, logged to deferred items.

## User Setup Required
**External services require manual configuration.** See [03-USER-SETUP.md](./03-USER-SETUP.md) for Clerk environment variables and dashboard configuration:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_SIGN_IN_URL (set to: /sign-in)
- NEXT_PUBLIC_CLERK_SIGN_UP_URL (set to: /sign-up)
- NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL (set to: /app)
- NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL (set to: /app)
- NEXT_PUBLIC_CLERK_FRONTEND_API
- Enable Google OAuth in Clerk Dashboard

## Next Phase Readiness
- Clerk infrastructure complete — Plan 02 (sign-in/sign-up pages with Clerk components) can proceed
- All /app/* routes are now protected; unauthenticated users redirect to /sign-in
- ClerkProvider provides auth context to all components in the app tree
- CSP is ready for Clerk to load without console errors (pending NEXT_PUBLIC_CLERK_FRONTEND_API being set)

---
*Phase: 03-auth-persistence*
*Completed: 2026-02-27*
