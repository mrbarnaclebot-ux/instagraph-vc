---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-02-27T13:12:45.374Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 25
  completed_plans: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Users can instantly generate and explore accurate visual maps of crypto VC relationships from any public funding announcement — without spreadsheets, manual research, or expensive tools.
**Current focus:** Phase 3 — Auth + Persistence (awaiting human verification)

## Current Position

Phase: 3 of 5 (Auth + Persistence)
Plan: 6 of 6 in current phase — Plan 06 checkpoint reached (human verify: all Phase 3 auth and persistence flow)
Status: Phase 3 checkpoint — all 6 plans executed; awaiting human sign-off on 6-scenario test matrix
Last activity: 2026-02-27 — Phase 3 Plan 06 checkpoint: human verification of Google OAuth, /app/* guard, graph persistence, history page, anonymous trial modal

Progress: [████████░░] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 2 min
- Total execution time: ~0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-backend-foundation | 5 | ~10 min | ~2 min |
| 02-monorepo-vertical-slice | 3 | ~8 min | ~3 min |

**Recent Trend:**
- Last 6 plans: 01-02 (1 min), 01-03 (~5 min), 01-04 (1 min), 01-05 (3 min), 02-01 (3 min), 02-04 (2 min)
- Trend: -

*Updated after each plan completion*

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-backend-foundation | P05 | 3 min | 2 | 6 |
| 02-monorepo-vertical-slice | P01 | 3 min | 3 | 21 |
| 02-monorepo-vertical-slice | P05 | 3 min | 2 | 3 |
| 02-monorepo-vertical-slice | P04 | 2 min | 1 | 3 |
| 05-landing-page-observability | P04 | 5 min | 2 | 5 |
| 05-landing-page-observability | P05 | 1 min | 1 | 1 |
| Phase 05-landing-page-observability P06 | 5 | 2 tasks | 1 files |
| 03-auth-persistence | P01 | 2 min | 2 | 5 |
| Phase 03-auth-persistence P04 | 3 | 2 tasks | 3 files |
| Phase 03-auth-persistence PP03 | 2 min | 2 tasks | 4 files |
| 03-auth-persistence | P05 | 2 min | 2 | 8 |
| Phase 03-auth-persistence P06 | 1 | 0 tasks | 0 files |
| Phase 01-backend-foundation P06 | 2 | 2 tasks | 3 files |
| Phase 01-backend-foundation PP07 | 1 | 1 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-phase]: Fork InstaGraph (not rebuild) — reuses proven OpenAI + Cytoscape + Neo4j integration
- [Pre-phase]: FastAPI over Flask — async support, better type safety, OpenAPI docs
- [Pre-phase]: Next.js 15 (not 14 as PROJECT.md states) — ships with React 19, Turbopack, async auth()
- [Pre-phase]: neo4j driver v5.28.3 (not v6) — breaking changes in v6, unsettled ecosystem compatibility
- [Pre-phase]: Supabase for tabular metadata, Neo4j for graph topology only — mixing them wastes Neo4j node quota
- [01-01]: uv --no-workspace required — repo root pyproject.toml (InstaGraph fork) lacks [project] table
- [01-01]: FastAPI lifespan asynccontextmanager established as singleton pattern for all driver connections
- [01-01]: session_id index created at startup (idempotent) for per-graph query isolation in Plan 02+
- [01-02]: ipaddress stdlib used for SSRF BLOCKED_NETWORKS — avoids regex IP range bugs, handles IPv4/IPv6 uniformly
- [01-02]: is_global catch-all after explicit BLOCKED_NETWORKS loop — defense-in-depth for non-routable addresses
- [01-02]: Error detail shape {error: str, message: str} established as API contract for 400 responses
- [01-04]: Manual PyJWT + PyJWKClient chosen over fastapi-clerk-auth (v0.0.9 low-activity) and clerk-backend-api (httpx.Request incompatible with starlette.Request)
- [01-04]: HTTPBearer(auto_error=False) — missing token returns 401 not FastAPI 422 validation error
- [01-04]: Catch-all except Exception intentional — JWKS network failures return 401 not 500
- [Phase 01-05]: validate_input_length() applied to text inputs only — URL inputs have their own content yield check in scrape_url() 500-char minimum
- [Phase 01-05]: OpenAI client as module-level singleton via _get_openai_client() lazy init — one client per worker process, matches PyJWKClient pattern from Plan 04
- [Phase 01-05]: patch('app.main.GraphDatabase.driver') in test fixture prevents lifespan from attempting real Neo4j connection in CI — required for integration tests without Docker
- [02-01]: JIT (Just-in-Time) shared-types strategy — no build step, Next.js Turbopack resolves TypeScript source directly; requires transpilePackages in next.config.ts
- [02-01]: workspace:* protocol required for pnpm internal package links — version strings cause npm registry lookup failure
- [02-01]: turbo.json uses 'tasks' key not 'pipeline' — pipeline is deprecated in Turborepo v2
- [02-01]: NEXT_PUBLIC_API_URL env var with localhost:8000 default in next.config.ts — works in dev without .env.local, overridable for production
- [02-05]: Vercel CLI (pull/build/deploy) over GitHub App — fine-grained monorepo control, scoped to apps/web working-directory
- [02-05]: astral-sh/setup-uv@v3 for Python CI — official action, cleaner than pip install uv bootstrap
- [02-05]: pnpm install --frozen-lockfile in CI — deterministic installs, fails fast on lock file drift
- [02-05]: Railway 30s timeout risk documented in deploy-production.yml comment — surfaces known concern directly in workflow
- [Phase 02-04]: AbortController in useRef not useState — changing ref must not trigger re-render cycle
- [Phase 02-04]: dynamic() with ssr:false pattern for react-cytoscapejs — accesses window at module load time
- [Phase 02-04]: AbortError caught silently without toast — user-initiated cancel is not an error
- [Phase 05-04]: page.tsx kept as Server Component (no 'use client') — Next.js App Router handles client component boundary (LandingNav, HeroSection) correctly at build time
- [Phase 05-04]: CtaBand links to /sign-in (not /app) — unauthenticated users go to Clerk auth flow
- [Phase 05-04]: LandingFooter uses new Date().getFullYear() — dynamic copyright year, no hardcoded value
- [Phase 05-landing-page-observability]: Truthiness check for PostHog key guard (not !== undefined) — also filters empty string which posthog rejects the same way
- [Phase 05-landing-page-observability]: TypeScript non-null assertion (!) removed from posthog.init() — string is narrowed to defined value inside if block, making ! redundant
- [Phase 05-landing-page-observability]: Sign up to save caption placed as right-column footer beneath graph — graph context makes prompt more meaningful
- [Phase 05-landing-page-observability]: Landing page GraphCanvas uses same dynamic() ssr:false pattern as apps/web/app/app/page.tsx
- [Phase 05-landing-page-observability]: onNodeClick={() => undefined} passed to GraphCanvas on landing page — no detail panel needed, no-op is correct and type-safe
- [03-01]: proxy.ts not middleware.ts — Next.js 16 uses proxy.ts; middleware.ts is silently ignored and auth guard would not work
- [03-01]: ClerkProvider wraps outside <html> element — required placement for Clerk context in Server Components
- [03-01]: NEXT_PUBLIC_CLERK_FRONTEND_API in CSP as env var — handles dev (clerk.accounts.dev) and prod (clerk.your-domain.com) without code changes
- [03-01]: pnpm --filter web from monorepo root required for add — cd apps/web && pnpm add fails with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND for @graphvc/shared-types@workspace:*
- [Phase 03-auth-persistence]: user_id default 'anonymous' — persist_graph works for both authed and trial users without branching
- [Phase 03-auth-persistence]: Fire-and-forget pattern: all Supabase writes in try/except pass blocks — Supabase failure never blocks Neo4j response
- [Phase 03-auth-persistence]: Auto-title: URL inputs use domain+date ('techcrunch.com · Feb 27'), text inputs use first 60 chars with ellipsis
- [Phase 03-auth-persistence]: Clerk catch-all slug [[...sign-in]] required — /sign-in/sso-callback 404s without it
- [Phase 03-auth-persistence]: getToken parameter optional in generateGraph — preserves backward compatibility for anonymous callers
- [03-05]: Trial gate in HeroSection (client component), not page.tsx (Server Component) — localStorage requires client context
- [03-05]: trialBlocked state separate from showTrialModal — tracks post-dismissal disabled state independently of modal visibility
- [03-05]: Fragment wrapper used in HeroSection return to render TrialModal as sibling to section without DOM wrapper
- [03-05]: Async params required in Next.js 15+ dynamic Route Handlers — always await params before destructuring
- [Phase 01-06]: MIN_TEXT_LENGTH = 200 matches backend validate_input_length() threshold
- [Phase 01-06]: 503 override only triggers when detail.message is generic 'HTTP 503' -- preserves real application 503s
- [Phase 01-07]: headers as real dict (not mock return_value) -- .get() works naturally, future bracket access won't break

### Pending Todos

None.

### Blockers/Concerns

- [Phase 1]: SSRF DNS rebinding has nuanced edge cases (IPv6-mapped addresses, redirect chains) — research-phase recommended before implementing scraper
- [Phase 3]: Clerk webhook + Supabase RLS policy setup has edge cases — research-phase recommended before implementing user sync
- [Pre-launch]: Neo4j Aura Free pauses after 3 days inactivity (30-60s cold start) — needs keep-alive cron or Aura Pro upgrade before Phase 5
- [Pre-launch]: Railway Hobby tier has 30s request timeout; graph generation can exceed this — verify Railway tier before Phase 1 deploy

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 01-07-PLAN.md (test mock Content-Type fix: 29/29 tests green)
Resume file: None
