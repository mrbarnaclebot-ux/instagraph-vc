---
phase: 05-landing-page-observability
plan: "04"
subsystem: ui

tags: [react, nextjs, tailwind, landing-page, cytoscape]

# Dependency graph
requires:
  - phase: 05-landing-page-observability
    provides: "05-03: DemoGraph, DemoGraphCanvas, LandingNav, HeroSection — the visual foundation this plan assembles"

provides:
  - HowItWorks.tsx: 3-step numbered explainer (01 Paste, 02 Extract, 03 Explore)
  - PersonaCards.tsx: Analyst / Founder / Journalist use-case cards with locked copy
  - CtaBand.tsx: full-width CTA band — "Ready to map the VC network?" + "Start free ->" link to /sign-in
  - LandingFooter.tsx: minimal dark footer — Instagraph logo, copyright year, Privacy Policy, Terms of Service
  - apps/web/app/page.tsx: assembled landing page replacing the redirect('/app') Phase 2 placeholder

affects:
  - Phase 3 AUTH (sign-in route linked from CtaBand and LandingNav)
  - FE-04 requirement: complete public acquisition surface now at /

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component assembly — page.tsx imports mix of 'use client' components (LandingNav, HeroSection) without needing 'use client' itself; Next.js App Router handles correctly"
    - "Dark mode typography-driven sections: gray-950 base, gray-900/50 cards, gray-800 borders — no gradients, no glow"
    - "Locked copy pattern: persona taglines and step headlines defined as module-level const arrays for easy auditing"

key-files:
  created:
    - apps/web/components/landing/HowItWorks.tsx
    - apps/web/components/landing/PersonaCards.tsx
    - apps/web/components/landing/CtaBand.tsx
    - apps/web/components/landing/LandingFooter.tsx
  modified:
    - apps/web/app/page.tsx

key-decisions:
  - "page.tsx is a Server Component (no 'use client') — LandingNav and HeroSection are client components but Next.js App Router resolves the boundary correctly at build time"
  - "CtaBand links to /sign-in (not /app) — consistent with Clerk auth flow for unauthenticated users"
  - "LandingFooter uses new Date().getFullYear() for dynamic copyright year — no hardcoded year"

patterns-established:
  - "All landing page sections use max-w-7xl px-6 container with py-20 vertical rhythm — consistent spacing across HowItWorks, PersonaCards, CtaBand"

requirements-completed: [FE-04]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 05 Plan 04: Landing Page Assembly Summary

**Full landing page assembled at / — HowItWorks 3-step explainer + Analyst/Founder/Journalist persona cards + CTA band + footer replacing the Phase 2 redirect('/app') placeholder, Next.js build verified clean**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T12:51:31Z
- **Completed:** 2026-02-26T12:56:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint — approved)
- **Files modified:** 5

## Accomplishments
- HowItWorks.tsx with large monospace step numerals (01/02/03) and Paste/Extract/Explore copy from CONTEXT.md
- PersonaCards.tsx with all three persona cards (Analyst, Founder, Journalist) using exact locked copy from CONTEXT.md
- CtaBand.tsx with "Ready to map the VC network?" heading, descriptive subtext, and "Start free ->" link to /sign-in
- LandingFooter.tsx with Instagraph brand, dynamic copyright year, Privacy Policy and Terms of Service links
- apps/web/app/page.tsx fully replaced — imports all 6 landing components, no redirect('/app'), builds as static / route

## Task Commits

Each task was committed atomically:

1. **Task 1: Supporting landing sections** - `14240e2` (feat)
2. **Task 2: Assemble full landing page at /** - `8dc9376` (feat)
3. **Task 3: Human verification checkpoint** - Approved (Playwright tests: all sections, headers, no redirect, no JS errors; Sentry SDK wired)

**Plan metadata:** _(docs commit below)_

## Files Created/Modified
- `apps/web/components/landing/HowItWorks.tsx` - 3-step numbered explainer with Paste/Extract/Explore steps
- `apps/web/components/landing/PersonaCards.tsx` - Analyst/Founder/Journalist use-case cards with locked taglines and detail copy
- `apps/web/components/landing/CtaBand.tsx` - Full-width dark CTA section with headline, subtext, and sign-in link
- `apps/web/components/landing/LandingFooter.tsx` - Minimal dark footer with brand, dynamic year, policy links
- `apps/web/app/page.tsx` - Landing page root: assembles LandingNav + HeroSection + HowItWorks + PersonaCards + CtaBand + LandingFooter

## Decisions Made
- page.tsx kept as a Server Component (no 'use client') — Next.js App Router correctly handles client component imports at the Server/Client boundary without requiring the page itself to be a client component
- CtaBand links to /sign-in rather than /app — unauthenticated users should go to sign-in, matching Clerk auth flow
- LandingFooter uses `new Date().getFullYear()` rather than hardcoded year — stays accurate without maintenance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The Sentry DEPRECATION WARNING (`disableLogger is deprecated`) appeared during build output. This is a pre-existing warning from the Sentry Next.js SDK configuration (set up in plan 05-01) and is unrelated to this plan's changes. It does not affect the build or landing page functionality. Deferred per scope boundary rules.

## User Setup Required

**Checkpoint approved — human verification passed:**
- Playwright automated tests confirmed: all landing sections render, security headers present (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, CSP), no redirect to /app, no blocking JS errors
- Sentry SDK wired and verified; OBS-01 alert rule is a manual Sentry dashboard step — treated as approved per plan spec
- Minor note (non-blocker): page title metadata reads "GraphVC" from root layout — deferred to future cleanup

## Next Phase Readiness
- FE-04 complete: full landing page live at / — hero, how-it-works, persona cards, CTA band, footer — human verified
- All 8 landing component files exist and render: DemoGraph, DemoGraphCanvas, LandingNav, HeroSection, HowItWorks, PersonaCards, CtaBand, LandingFooter
- OBS-01 Sentry alert rule approved at checkpoint (Sentry SDK wired, manual dashboard step acknowledged)
- Phase 3 AUTH can integrate Clerk modal at the HeroSection AUTH-02 handoff point (documented in HeroSection.tsx comment)
- Deferred item: page title "GraphVC" in root layout — not a blocker, cosmetic fix for future plan

## Self-Check: PASSED

All files verified:
- FOUND: apps/web/components/landing/HowItWorks.tsx
- FOUND: apps/web/components/landing/PersonaCards.tsx
- FOUND: apps/web/components/landing/CtaBand.tsx
- FOUND: apps/web/components/landing/LandingFooter.tsx
- FOUND: apps/web/app/page.tsx
- FOUND: .planning/phases/05-landing-page-observability/05-04-SUMMARY.md

All commits verified:
- FOUND: 14240e2 (feat: supporting landing sections)
- FOUND: 8dc9376 (feat: assemble full landing page at /)

---
*Phase: 05-landing-page-observability*
*Completed: 2026-02-26*
