---
phase: 05-landing-page-observability
plan: "01"
subsystem: infra
tags: [sentry, security-headers, observability, nextjs, fastapi]

# Dependency graph
requires:
  - phase: 02-monorepo-vertical-slice
    provides: Next.js app foundation and FastAPI backend

provides:
  - Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, CSP) on every Next.js response
  - Sentry browser SDK initialized via instrumentation-client.ts (App Router)
  - Sentry server SDK initialized via instrumentation.ts + sentry.server.config.ts
  - global-error.tsx error boundary capturing unhandled React errors to Sentry
  - FastAPI backend Sentry init with StarletteIntegration + FastApiIntegration

affects: []

# Tech tracking
tech-stack:
  added: ['@sentry/nextjs', 'sentry-sdk[fastapi]>=2.0']
  patterns:
    - Security headers applied via headers() in next.config.ts with source '/(.*)'
    - Sentry wired via withSentryConfig wrapper on Next.js config
    - FastAPI Sentry init guarded behind sentry_dsn check — skips in dev without credentials

key-files:
  created:
    - apps/web/instrumentation-client.ts
    - apps/web/instrumentation.ts
    - apps/web/sentry.server.config.ts
    - apps/web/app/global-error.tsx
  modified:
    - apps/web/next.config.ts
    - apps/api/app/config.py
    - apps/api/app/main.py
    - apps/api/pyproject.toml

key-decisions:
  - "Security headers in headers() function with source '/(.*)'  — applied to all routes before any middleware"
  - "Sentry wired via withSentryConfig Next.js wrapper + tunnelRoute to bypass ad-blockers"
  - "FastAPI Sentry init guarded by sentry_dsn check — prevents noise in local dev without env vars"
  - "global-error.tsx uses Sentry.captureException for unhandled React render errors"

patterns-established:
  - "Next.js security headers pattern: headers() in next.config.ts with wildcard source"
  - "Sentry App Router pattern: instrumentation.ts (server) + instrumentation-client.ts (browser) split"

requirements-completed: [SEC-05, OBS-01]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 5 Plan 01: Security Headers + Sentry Integration Summary

**Security headers wired into Next.js for all routes; Sentry initialized in both Next.js frontend (browser + server) and FastAPI backend with environment-guarded init**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T06:40:45Z
- **Completed:** 2026-02-26T06:43:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Security headers (X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, X-XSS-Protection: 1; mode=block, Content-Security-Policy) added to next.config.ts via headers() with wildcard route
- Sentry browser SDK initialized in instrumentation-client.ts (Next.js App Router client entry point)
- Sentry server SDK initialized in instrumentation.ts + sentry.server.config.ts
- global-error.tsx error boundary captures unhandled React errors and reports to Sentry
- next.config.ts wrapped with withSentryConfig with tunnelRoute to bypass ad-blockers
- FastAPI: sentry-sdk[fastapi] added to pyproject.toml; sentry_dsn + environment fields added to Settings; sentry_sdk.init() called with StarletteIntegration + FastApiIntegration before app = FastAPI()

## Task Commits

Each task was committed atomically:

1. **Task 1: Security headers + Sentry Next.js wiring** - `1e38d81` (feat)
2. **Task 2: Sentry FastAPI backend init** - `b0d4aac` (feat)

## Files Created/Modified

- `apps/web/next.config.ts` - Added security headers via headers() function + withSentryConfig wrapper with tunnelRoute
- `apps/web/instrumentation-client.ts` - Sentry.init() for browser SDK (App Router client entry)
- `apps/web/instrumentation.ts` - Sentry server-side hook (registerOTel)
- `apps/web/sentry.server.config.ts` - Sentry server config with NEXT_PUBLIC_SENTRY_DSN
- `apps/web/app/global-error.tsx` - Error boundary with Sentry.captureException for unhandled React errors
- `apps/api/app/config.py` - Added sentry_dsn and environment Settings fields (default empty string)
- `apps/api/app/main.py` - Added sentry_sdk.init() with integrations, guarded by sentry_dsn check
- `apps/api/pyproject.toml` - Added sentry-sdk[fastapi]>=2.0 dependency

## Decisions Made

- Sentry init guarded by sentry_dsn check in FastAPI: allows development without credentials while ensuring production errors route to Sentry
- tunnelRoute in withSentryConfig: routes Sentry traffic through /monitoring Next.js API route to bypass ad-blockers that block app.sentry.io
- global-error.tsx required for App Router: replaces pages/_error.tsx for capturing unhandled render errors in App Router

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

Both Sentry integrations require environment variables before errors are captured:

**Next.js (Vercel or .env.local):**
```
NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token  # for source maps upload
```

**FastAPI (.env):**
```
SENTRY_DSN=https://your-key@sentry.io/project-id
ENVIRONMENT=production
```

Get DSN from: Sentry project settings > Client Keys (DSN).

---
*Phase: 05-landing-page-observability*
*Completed: 2026-02-26*
