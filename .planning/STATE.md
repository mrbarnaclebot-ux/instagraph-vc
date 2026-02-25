# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Users can instantly generate and explore accurate visual maps of crypto VC relationships from any public funding announcement — without spreadsheets, manual research, or expensive tools.
**Current focus:** Phase 1 — Backend Foundation

## Current Position

Phase: 1 of 5 (Backend Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-25 — Roadmap created; 27/27 v1 requirements mapped across 5 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: none yet
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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: `fastapi-clerk-auth` is v0.0.9, low-activity library — have manual PyJWT + PyJWKClient fallback pattern ready
- [Phase 1]: SSRF DNS rebinding has nuanced edge cases (IPv6-mapped addresses, redirect chains) — research-phase recommended before implementing scraper
- [Phase 3]: Clerk webhook + Supabase RLS policy setup has edge cases — research-phase recommended before implementing user sync
- [Pre-launch]: Neo4j Aura Free pauses after 3 days inactivity (30-60s cold start) — needs keep-alive cron or Aura Pro upgrade before Phase 5
- [Pre-launch]: Railway Hobby tier has 30s request timeout; graph generation can exceed this — verify Railway tier before Phase 1 deploy

## Session Continuity

Last session: 2026-02-25
Stopped at: Roadmap created — ready to run /gsd:plan-phase 1
Resume file: None
