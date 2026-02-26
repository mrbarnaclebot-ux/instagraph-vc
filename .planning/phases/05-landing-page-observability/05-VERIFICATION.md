---
phase: 05-landing-page-observability
verified: 2026-02-26T14:00:00Z
status: passed
score: 3/3 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 2/3
  gaps_closed:
    - "@sentry/nextjs declared in apps/web/package.json (^10.40.0) and committed to pnpm-lock.yaml via commit 11db4b6 — fresh pnpm install will now resolve the package correctly"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Verify Sentry alert rule configured in Sentry dashboard"
    expected: "An active alert rule exists in the Instagraph project that fires when error rate exceeds 1% over a 5-minute window"
    why_human: "Cannot verify external Sentry dashboard configuration programmatically. The plan 04 checkpoint was approved by human and is carried forward."
  - test: "Verify demo graph animates on page load"
    expected: "On visiting /, the demo graph nodes animate (fly into position from scattered locations) over ~800ms using fcose with animationDuration: 800. Node colors match app entity types."
    why_human: "Cytoscape animation and visual styling cannot be verified by static file analysis — requires browser render."
---

# Phase 5: Landing Page + Observability Verification Report

**Phase Goal:** The product has a public acquisition surface, is hardened with security headers, and is instrumented so that production errors and user funnel events are visible before any public traffic arrives.
**Verified:** 2026-02-26
**Status:** passed
**Re-verification:** Yes — after gap closure (commit 11db4b6)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Visiting `/` shows landing page with hero (input + animated demo graph), How it works 3-step explainer, Analyst/Founder/Journalist persona cards, and a footer | VERIFIED | `apps/web/app/page.tsx` imports and renders: LandingNav, HeroSection (contains textarea + DemoGraph), HowItWorks (01 Paste / 02 Extract / 03 Explore), PersonaCards (3 personas with exact locked copy), CtaBand, LandingFooter. No `redirect('/app')` present. |
| 2 | Every page response includes X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, X-XSS-Protection: 1; mode=block, and a Content Security Policy | VERIFIED | `apps/web/next.config.ts` defines `securityHeaders` array with all 4 keys (lines 7-29), returned via `headers()` with `source: '/(.*)'`. CSP covers script-src, style-src, and connect-src. `withSentryConfig` wraps the export (line 42). |
| 3 | An uncaught exception in either the Next.js frontend or FastAPI backend appears in the Sentry dashboard within 60 seconds, tagged with user context | VERIFIED | `@sentry/nextjs ^10.40.0` declared in `apps/web/package.json` (line 14) and recorded in `pnpm-lock.yaml` under `apps/web` importer (lines 23-25, specifier `^10.40.0`, version `10.40.0`). All instrumentation files correct. FastAPI: `sentry_sdk.init()` before `app = FastAPI()` with both integrations. Deployment-safe on fresh `pnpm install`. |

**Score:** 3/3 truths verified

---

### Required Artifacts

#### Plan 01 Artifacts (SEC-05, OBS-01)

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/web/package.json` | VERIFIED | `@sentry/nextjs: ^10.40.0` declared in `dependencies` (line 14). Added by commit 11db4b6. |
| `apps/web/next.config.ts` | VERIFIED | Contains `securityHeaders` array with X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Content-Security-Policy. `headers()` returns `source: '/(.*)'`. Wrapped with `withSentryConfig`. |
| `apps/web/instrumentation-client.ts` | VERIFIED | `Sentry.init()` present with `NEXT_PUBLIC_SENTRY_DSN`, `sendDefaultPii: true`. `@sentry/nextjs` now properly declared — no deployment risk. |
| `apps/web/instrumentation.ts` | VERIFIED | `register()` function present, conditionally imports `./sentry.server.config` on nodejs runtime. |
| `apps/web/sentry.server.config.ts` | VERIFIED | `Sentry.init()` with `SENTRY_DSN`, `tracesSampleRate: 0.1`, `sendDefaultPii: true`. |
| `apps/web/app/global-error.tsx` | VERIFIED | `'use client'`, `Sentry.captureException(error)` in `useEffect`, renders error UI with reset button. |
| `apps/api/app/config.py` | VERIFIED | `sentry_dsn: str = ""` and `environment: str = "development"` fields present in Settings class. |
| `apps/api/app/main.py` | VERIFIED | `sentry_sdk.init()` with both `StarletteIntegration()` and `FastApiIntegration()` called BEFORE `app = FastAPI(...)`. Guarded by `if settings.sentry_dsn:`. |
| `pnpm-lock.yaml` | VERIFIED | `apps/web` importer section (lines 23-25) records `@sentry/nextjs` specifier `^10.40.0` resolved to `10.40.0`. Committed in 11db4b6. |

#### Plan 02 Artifacts (OBS-02)

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/web/app/providers.tsx` | VERIFIED | `'use client'` directive present. `posthog.init()` called in `useEffect` with `api_host`, `capture_pageview: false`. Wrapped with `PHProvider`. |
| `apps/web/app/layout.tsx` | VERIFIED | Imports `PostHogProvider` from `./providers`. Wraps `{children}` and `<Toaster>` inside `<PostHogProvider>`. |
| `apps/web/lib/analytics.ts` | VERIFIED | Exports `captureGraphGenerated`, `captureGraphExported` (stub), `captureGraphHistoryViewed` (stub). All documented with Phase ownership comments. |
| `apps/web/app/app/page.tsx` | VERIFIED | Imports `captureGraphGenerated` from `@/lib/analytics`. Calls it in the success branch after `setGraph(data.graph)` and `setStatus('success')` with `nodes.length`, `edges.length`, and source type detection. |

#### Plan 03 Artifacts (FE-04 partial)

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/web/components/landing/DemoGraph.tsx` | VERIFIED | `'use client'`, dynamic import of `DemoGraphCanvas` with `ssr: false`, `DEMO_GRAPH_DATA` with 8 nodes (Investor, Project, Round, Narrative, Person types), exports `default DemoGraph`. |
| `apps/web/components/landing/DemoGraphCanvas.tsx` | VERIFIED | `Cytoscape.use(fcose)` at module level (not inside component). `CytoscapeComponent` with `cytoscapeStylesheet`, fcose layout with `animate: true`, `animationDuration: 800`. |
| `apps/web/components/landing/LandingNav.tsx` | VERIFIED | `'use client'`, sticky nav, Instagraph text logo left, conditional Sign In / Go to app right via `isAuthenticated` prop. |
| `apps/web/components/landing/HeroSection.tsx` | VERIFIED | Split `lg:grid-cols-2` layout. Textarea input (anonymous trial). `DemoGraph` in right column with `hidden lg:block`. Post-trial inline sign-up prompt with AUTH-02 deferral comment. `handleTry` calls `/api/generate`. |

#### Plan 04 Artifacts (FE-04 complete)

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/web/components/landing/HowItWorks.tsx` | VERIFIED | Three steps: 01 Paste, 02 Extract, 03 Explore. Large monospace numerals. Correct locked copy. |
| `apps/web/components/landing/PersonaCards.tsx` | VERIFIED | Three persona cards: Analyst, Founder, Journalist with exact locked taglines from CONTEXT.md. |
| `apps/web/components/landing/CtaBand.tsx` | VERIFIED | "Ready to map the VC network?" heading. "Start free →" link to `/sign-in`. |
| `apps/web/components/landing/LandingFooter.tsx` | VERIFIED | Instagraph brand, dynamic `new Date().getFullYear()`, Privacy Policy + Terms of Service links. |
| `apps/web/app/page.tsx` | VERIFIED | Imports all 6 landing components. No `redirect('/app')`. Server Component (no `'use client'`). |

---

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/package.json` | `@sentry/nextjs` installed on fresh deploy | Declared dependency + pnpm-lock.yaml entry | VERIFIED | `^10.40.0` in dependencies (line 14); lockfile records resolved version 10.40.0 under apps/web importer (lines 23-25). Commit 11db4b6. |
| `apps/web/next.config.ts` | Security headers on every response | `headers()` with `source: '/(.*)'` | WIRED | Confirmed in file at lines 29-31 |
| `apps/api/app/main.py` | Sentry error capture | `sentry_sdk.init()` at module level before `app = FastAPI()` | WIRED | `sentry_sdk.init()` lines 10-22, `app = FastAPI()` at line 44 |
| `apps/web/instrumentation-client.ts` | Sentry browser error capture | `Sentry.init` with `NEXT_PUBLIC_SENTRY_DSN` | WIRED | Code present and dependency declared in package.json + lockfile |

#### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/app/providers.tsx` | PostHog browser SDK | `posthog.init(NEXT_PUBLIC_POSTHOG_KEY, { api_host: ... })` | WIRED | Confirmed in `useEffect` at lines 9-13 |
| `apps/web/app/layout.tsx` | `apps/web/app/providers.tsx` | `PostHogProvider` wrapping `{children}` | WIRED | `<PostHogProvider>` wraps children at lines 19-22 |
| `apps/web/app/app/page.tsx` | `apps/web/lib/analytics.ts` | `captureGraphGenerated(nodes.length, edges.length, sourceType)` | WIRED | Call at lines 60-64, in success branch after `setGraph` and `setStatus('success')` |

#### Plan 03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/components/landing/DemoGraph.tsx` | `apps/web/components/landing/DemoGraphCanvas.tsx` | `dynamic(() => import('./DemoGraphCanvas'), { ssr: false })` | WIRED | `ssr: false` confirmed at line 7 |
| `apps/web/components/landing/DemoGraphCanvas.tsx` | `apps/web/components/graph/cytoscapeStyles.ts` | `import { cytoscapeStylesheet } from '@/components/graph/cytoscapeStyles'` | WIRED | Import at line 6, used in `stylesheet={cytoscapeStylesheet}` at line 25 |

#### Plan 04 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/app/page.tsx` | All landing components | Direct imports of LandingNav, HeroSection, HowItWorks, PersonaCards, CtaBand, LandingFooter | WIRED | All 6 imports at lines 1-6, all rendered in JSX |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| FE-04 | 05-03, 05-04 | Landing page at `/` with hero (input + demo graph), How it works, use case cards, footer | SATISFIED | `app/page.tsx` assembles all required sections. HeroSection has anonymous trial input and DemoGraph. HowItWorks has 3 steps. PersonaCards has 3 personas. LandingFooter present. |
| SEC-05 | 05-01 | Security headers on every response: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, CSP | SATISFIED | `next.config.ts` headers() with source `'/(.*)'` returns all 4 required headers. |
| OBS-01 | 05-01, 05-04 | Sentry on Next.js frontend and FastAPI backend; uncaught exceptions captured with user context; alert rule | SATISFIED | `@sentry/nextjs ^10.40.0` declared in package.json and pnpm-lock.yaml (commit 11db4b6). All instrumentation files correct and importable on fresh deploy. FastAPI: fully satisfied. Alert rule: human-verified per checkpoint approval. |
| OBS-02 | 05-02 | PostHog configured; tracks graph_generated (node_count, edge_count, source_type), graph_exported (format), graph_history_viewed | PARTIAL (by design) | `graph_generated` is wired and fires in `app/app/page.tsx`. `graph_exported` and `graph_history_viewed` are intentional stubs documented for Phase 4 (EXP-01/EXP-02) and Phase 3 (FE-03) respectively. The plan explicitly scoped Phase 5 to only deliver `graph_generated` firing. The requirement remains open until those phases are built. |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `apps/web/lib/analytics.ts` | `captureGraphExported` and `captureGraphHistoryViewed` have no callers | INFO | Intentional design — documented stubs for Phase 4 (EXP-01/EXP-02) and Phase 3 (FE-03). Not a blocker. |

No blocker anti-patterns remain. The previous blocker (`@sentry/nextjs` missing from package.json + lockfile) is resolved by commit 11db4b6.

---

### Human Verification Required

#### 1. Sentry Alert Rule Configuration

**Test:** Log in to https://sentry.io, navigate to the Instagraph project, go to Alerts, and verify an active alert rule exists.
**Expected:** Alert rule triggers when error rate exceeds 1% over a 5-minute window. Notification channel configured (email or Slack).
**Why human:** Cannot verify external Sentry dashboard configuration programmatically. Plan 04 checkpoint was approved by human, but this cannot be re-verified automatically.

#### 2. Demo Graph Visual Animation

**Test:** Visit `http://localhost:3000/` in a browser, observe the right-column demo graph on desktop viewport.
**Expected:** Nodes animate (fly into position from scattered locations) over ~800ms using fcose layout. Node colors match VC entity types: indigo ellipses (Investor), emerald rectangles (Project), amber diamonds (Round), violet hexagons (Narrative), pink ellipses (Person).
**Why human:** Cytoscape animation and Tailwind-driven visual styling cannot be verified by static analysis — requires browser render.

---

### Gap Closure Summary

**Gap resolved:** commit 11db4b6 (`fix(05-01): declare @sentry/nextjs in apps/web package.json`)

The previous verification identified that `@sentry/nextjs` had been installed locally (`pnpm add @sentry/nextjs`) during plan 05-01 execution but the updated `package.json` and `pnpm-lock.yaml` were not committed. This meant every file importing from `@sentry/nextjs` (`next.config.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `global-error.tsx`) would fail on any fresh `pnpm install` in CI/CD or on new developer machines.

The fix: `apps/web/package.json` now declares `"@sentry/nextjs": "^10.40.0"` in `dependencies`. The `pnpm-lock.yaml` `apps/web` importer section records the fully resolved version `10.40.0` with all peer dependencies. Both files committed. The deployment risk is eliminated.

No other changes were made in the fix commit — all previously verified artifacts (security headers, FastAPI Sentry, PostHog, landing page components) are unchanged.

---

## Commit Verification

| Commit | Description | Status |
|--------|-------------|--------|
| `1e38d81` | feat(05-01): security headers + Sentry Next.js wiring | VERIFIED |
| `b0d4aac` | feat(05-01): Sentry FastAPI backend init | VERIFIED |
| `b12008a` | feat(05-02): add PostHog provider and layout integration | VERIFIED |
| `9b04df4` | feat(05-02): add analytics helpers and wire graph_generated event | VERIFIED |
| `826c500` | feat(05-03): DemoGraph canvas components | VERIFIED |
| `f409a69` | feat(05-03): LandingNav and HeroSection components | VERIFIED |
| `14240e2` | feat(05-04): add supporting landing sections | VERIFIED |
| `8dc9376` | feat(05-04): assemble full landing page at / | VERIFIED |
| `11db4b6` | fix(05-01): declare @sentry/nextjs in apps/web package.json | VERIFIED — closes OBS-01 gap |

---

_Verified: 2026-02-26_
_Verifier: Claude (gsd-verifier)_
