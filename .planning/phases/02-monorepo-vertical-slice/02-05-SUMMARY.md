---
phase: 02-monorepo-vertical-slice
plan: 05
subsystem: infra
tags: [github-actions, ci-cd, vercel, railway, turborepo, pnpm, uv, pytest]

# Dependency graph
requires:
  - phase: 02-monorepo-vertical-slice
    provides: Turborepo monorepo foundation with pnpm workspaces, apps/web and apps/api structure
  - phase: 01-backend-foundation
    provides: FastAPI app in apps/api with uv-managed Python deps and pytest test suite
provides:
  - CI pipeline running pnpm turbo typecheck lint and uv run pytest on every push/PR
  - Vercel preview deployment on every PR via Vercel CLI (pull/build/deploy pattern)
  - Railway production deployment on every merge to main via railway up --service=api
affects: [03-graph-canvas-query, 04-auth-user-management, 05-launch-hardening]

# Tech tracking
tech-stack:
  added: [github-actions, astral-sh/setup-uv@v3, pnpm/action-setup@v3, vercel-cli, @railway/cli]
  patterns: [Vercel CLI approach over GitHub App for monorepo control, uv for Python CI (not pip install requirements.txt)]

key-files:
  created:
    - .github/workflows/ci.yml
    - .github/workflows/deploy-preview.yml
    - .github/workflows/deploy-production.yml
  modified: []

key-decisions:
  - "Vercel CLI (pull/build/deploy) over GitHub App — gives fine-grained monorepo control with working-directory: apps/web"
  - "astral-sh/setup-uv@v3 for Python CI — official action, cleaner than pip install uv bootstrap"
  - "railway up --service=api for Railway deploy — straightforward CLI deploy from apps/api working-directory"
  - "pnpm install --frozen-lockfile in CI — deterministic installs, fails fast on lock file drift"

patterns-established:
  - "CI pattern: checkout → pnpm setup → node setup → frozen install → turbo run → uv setup → pytest"
  - "Vercel deploy pattern: vercel pull --environment=preview → vercel build → vercel deploy --prebuilt (all in apps/web)"
  - "Secrets pattern: VERCEL_TOKEN/ORG_ID/PROJECT_ID for preview; RAILWAY_TOKEN for production"

requirements-completed: [INFRA-03]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 2 Plan 05: CI/CD Workflows Summary

**Three GitHub Actions workflows wiring Turborepo CI (typecheck + lint + pytest) plus Vercel preview and Railway production deployments**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-25T17:38:45Z
- **Completed:** 2026-02-25T17:41:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- CI workflow runs on every push to main and every PR: pnpm turbo typecheck/lint + uv pytest in apps/api
- Vercel preview deployment triggered on every PR using Vercel CLI pattern with apps/web working-directory
- Railway production deployment on main merge using railway up --service=api

## Task Commits

Each task was committed atomically:

1. **Task 1: CI workflow — typecheck, lint, pytest** - `d3c8b38` (chore)
2. **Task 2: Deploy preview + production workflows** - `eb23a61` (chore)

**Plan metadata:** (final docs commit)

## Files Created/Modified

- `.github/workflows/ci.yml` — CI pipeline: pnpm 9 + Node 20, turbo typecheck lint, astral-sh/setup-uv@v3, uv run pytest tests/ -x in apps/api, fetch-depth: 2
- `.github/workflows/deploy-preview.yml` — Vercel preview on PR: install vercel CLI, pull/build/deploy in apps/web with VERCEL_TOKEN/ORG_ID/PROJECT_ID secrets
- `.github/workflows/deploy-production.yml` — Railway production on main push: railway up --service=api with RAILWAY_TOKEN; comment documenting 30s timeout risk

## Decisions Made

- Vercel CLI approach (not GitHub App) chosen for fine-grained monorepo control — Vercel commands scoped to `apps/web` working-directory
- `astral-sh/setup-uv@v3` for Python CI — official GitHub Action for uv, avoids `pip install uv` bootstrap complexity
- `pnpm install --frozen-lockfile` in CI — deterministic installs, fails fast if pnpm-lock.yaml is out of sync
- `fetch-depth: 2` in CI — minimum needed for Turborepo remote caching change detection
- Railway timeout risk comment embedded in deploy-production.yml — surfaces known concern from STATE.md blockers directly in the workflow file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — existing `.github/workflows/check_code.yaml` (from InstaGraph fork) left in place; it runs legacy `pip install requirements.txt` + `make lint` but is unrelated to the new monorepo workflows.

## User Setup Required

**External services require manual configuration before workflows will run successfully.**

### GitHub Secrets to Add
Navigate to: GitHub repo → Settings → Secrets and variables → Actions → New repository secret

| Secret | Source |
|--------|--------|
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens → Create Token |
| `VERCEL_ORG_ID` | Run `vercel link` in `apps/web` → outputs `.vercel/project.json` with `orgId` |
| `VERCEL_PROJECT_ID` | Run `vercel link` in `apps/web` → outputs `.vercel/project.json` with `projectId` |
| `RAILWAY_TOKEN` | Railway Dashboard → Account Settings → Tokens → New Token |

### Vercel Dashboard Config
1. Set Root Directory to `apps/web` — Vercel Dashboard → Project Settings → General → Root Directory
2. Set Ignored Build Step: `npx turbo-ignore --fallback=HEAD^1` — Vercel Dashboard → Project Settings → Git → Ignored Build Step

### Railway Dashboard Config
1. Create Railway project and link to `apps/api` service — Railway Dashboard → New Project → Deploy from GitHub → select instagraph-vc

## Next Phase Readiness

- CI/CD automation backbone complete — all three workflows ready to fire once GitHub secrets are added
- Merge to main will now trigger Railway deploy; PRs will trigger Vercel preview + CI checks
- Known concern: Railway 30s timeout may affect graph generation with GPT-4o — documented in workflow comment, requires Railway Pro upgrade if hit in production

---
*Phase: 02-monorepo-vertical-slice*
*Completed: 2026-02-25*
