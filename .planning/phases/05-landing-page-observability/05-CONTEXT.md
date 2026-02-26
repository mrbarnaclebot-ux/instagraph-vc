# Phase 5: Landing Page + Observability - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Public acquisition surface at `/` — a landing page with anonymous trial, embedded interactive demo graph, "How it works" explainer, persona use-case cards, and a bottom CTA band. Plus security headers hardening and Sentry/PostHog instrumentation. Creating new features, pricing tiers, or auth flows are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Demo graph in hero
- Fully interactive Cytoscape canvas (same as app) using hardcoded fictional-but-realistic crypto VC data
- Fictional fund/project names — invented but plausible (avoids IP/accuracy concerns)
- Animates in on load with staggered node/edge entrance using fcose layout
- Split hero layout: input card left, demo graph fills right side above the fold

### Visual style & layout
- Dark mode base (slate/zinc 900+) — premium data tool aesthetic, node colors pop
- Tone: premium data tool (Palantir/Hex reference) — clean, precise, typography-driven, minimal decoration
- Minimal sticky nav: logo left, Sign In CTA right only — no extra nav links
- "How it works" section: numbered steps with icons (large numerals or icons, headline + 1-2 sentence description each)

### Copy & content
- Hero headline direction: outcome-led ("Map the crypto VC network in seconds" style — concrete, tool-forward)
- 3 steps: **Paste → Extract → Explore**
  1. Paste a funding announcement or URL
  2. AI extracts investors, projects, rounds, and relationships
  3. Explore the interactive knowledge graph
- Persona cards: use-case led — what each audience does with the product
  - Analyst: "Track which funds lead which rounds across 100+ deals"
  - Founder: "See who's invested in your competitors before you pitch"
  - Journalist: "Map the investor network behind any narrative in minutes"
- Footer: minimal — logo + © year + Privacy Policy + Terms of Service links

### Conversion & CTAs
- After anonymous trial on landing page: sign-up prompt modal appears in-place (same Phase 3 modal, not a redirect)
- Bottom CTA band above footer: full-width "Ready to map the VC network?" + "Start free" / "Sign up" button
- No pricing section — free trial is the hook; pricing is a future phase
- Nav is auth-aware: unauthenticated → "Sign In" button; authenticated → "Go to app" button

### Claude's Discretion
- Exact fictional names for demo graph data (companies, funds, people, round amounts)
- Specific icon choices for How it works steps
- Exact hero headline and subheading copy (within outcome-led direction)
- Loading skeleton and animation timing for demo graph entrance
- Spacing, typography scale, and component-level visual details
- CSP header configuration specifics (exact sources list)
- Sentry user context tagging implementation
- PostHog event property schema beyond what's spec'd

</decisions>

<specifics>
## Specific Ideas

- The demo graph should use the same Cytoscape node styling as the app (indigo investor ellipses, emerald project rectangles, amber round diamonds, violet narrative hexagons, pink person ellipses) — visual consistency between landing and app builds familiarity
- The product name "Instagraph" should appear in the nav logo — no separate wordmark needed initially
- Premium data tool aesthetic reference: Palantir, Hex — not crypto-native web3 glows/gradients

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-landing-page-observability*
*Context gathered: 2026-02-26*
