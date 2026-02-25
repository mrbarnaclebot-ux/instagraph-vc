# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Users can instantly generate and explore accurate visual maps of crypto VC relationships from any public funding announcement — without spreadsheets, manual research, or expensive tools.
**Current focus:** Phase 2 — Monorepo Vertical Slice

## Current Position

Phase: 2 of 5 (Monorepo Vertical Slice)
Plan: 1 of 4 in current phase — Plan 02-01 complete
Status: Phase 2 in progress
Last activity: 2026-02-25 — Plan 02-01 complete: Turborepo monorepo foundation with pnpm workspaces, @graphvc/shared-types, Next.js 16 skeleton

Progress: [███░░░░░░░] 24%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 2 min
- Total execution time: ~0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-backend-foundation | 5 | ~10 min | ~2 min |
| 02-monorepo-vertical-slice | 1 | ~3 min | ~3 min |

**Recent Trend:**
- Last 6 plans: 01-01 (3 min), 01-02 (1 min), 01-03 (~5 min), 01-04 (1 min), 01-05 (3 min), 02-01 (3 min)
- Trend: -

*Updated after each plan completion*

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-backend-foundation | P05 | 3 min | 2 | 6 |
| 02-monorepo-vertical-slice | P01 | 3 min | 3 | 21 |

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: SSRF DNS rebinding has nuanced edge cases (IPv6-mapped addresses, redirect chains) — research-phase recommended before implementing scraper
- [Phase 3]: Clerk webhook + Supabase RLS policy setup has edge cases — research-phase recommended before implementing user sync
- [Pre-launch]: Neo4j Aura Free pauses after 3 days inactivity (30-60s cold start) — needs keep-alive cron or Aura Pro upgrade before Phase 5
- [Pre-launch]: Railway Hobby tier has 30s request timeout; graph generation can exceed this — verify Railway tier before Phase 1 deploy

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 02-01-PLAN.md — Turborepo monorepo foundation with @graphvc/shared-types and Next.js 16 skeleton
Resume file: None
