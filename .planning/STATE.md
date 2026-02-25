# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Users can instantly generate and explore accurate visual maps of crypto VC relationships from any public funding announcement — without spreadsheets, manual research, or expensive tools.
**Current focus:** Phase 1 — Backend Foundation

## Current Position

Phase: 1 of 5 (Backend Foundation)
Plan: 4 of 5 in current phase
Status: In progress
Last activity: 2026-02-25 — Plan 01-04 complete: Clerk JWT authentication dependency

Progress: [████░░░░░░] 16%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 2 min
- Total execution time: ~0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-backend-foundation | 4 | ~7 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (3 min), 01-02 (1 min), 01-03, 01-04 (1 min)
- Trend: -

*Updated after each plan completion*

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: SSRF DNS rebinding has nuanced edge cases (IPv6-mapped addresses, redirect chains) — research-phase recommended before implementing scraper
- [Phase 3]: Clerk webhook + Supabase RLS policy setup has edge cases — research-phase recommended before implementing user sync
- [Pre-launch]: Neo4j Aura Free pauses after 3 days inactivity (30-60s cold start) — needs keep-alive cron or Aura Pro upgrade before Phase 5
- [Pre-launch]: Railway Hobby tier has 30s request timeout; graph generation can exceed this — verify Railway tier before Phase 1 deploy

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 01-04-PLAN.md — Clerk JWT authentication dependency
Resume file: None
