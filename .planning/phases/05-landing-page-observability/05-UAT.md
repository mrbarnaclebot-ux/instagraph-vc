---
status: diagnosed
phase: 05-landing-page-observability
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md]
started: 2026-02-26T07:30:00Z
updated: 2026-02-26T07:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Landing page loads at /
expected: Visit http://localhost:3000/ — the landing page appears, dark-themed. No redirect to /app.
result: issue
reported: "PostHog console.error fires on every page load: 'PostHog was initialized without a token'"
severity: minor

### 2. Nav bar renders correctly
expected: A sticky top nav shows "Instagraph" text/logo on the left and a "Sign In" (or "Go to app") button on the right.
result: pass

### 3. Hero section: split layout with demo graph
expected: The hero section has a split layout — left side has a headline and a textarea input; right side has an animated Cytoscape graph with colored nodes (indigo, emerald, amber, violet, pink). Nodes should animate into position over ~800ms on page load.
result: pass

### 4. How It Works section
expected: Scrolling down shows a "How it works" section with three numbered steps: 01 Paste, 02 Extract, 03 Explore — each with a label and short description.
result: pass

### 5. Persona cards
expected: Scrolling further shows three use-case cards for: ANALYST ("Track which funds lead which rounds across 100+ deals"), FOUNDER ("See who's invested in your competitors before you pitch"), JOURNALIST ("Map the investor network behind any narrative in minutes").
result: pass

### 6. CTA band
expected: A full-width dark section with the heading "Ready to map the VC network?" and a "Start free" button/link.
result: pass

### 7. Footer
expected: A minimal dark footer showing the Instagraph brand, copyright notice, and links to "Privacy Policy" and "Terms of Service".
result: pass

### 8. Security headers in browser
expected: In DevTools → Network → click the document request for localhost:3000 → Response Headers tab should show:
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Content-Security-Policy: (a CSP header should be present)
result: pass

### 9. Anonymous trial: graph generation from landing page
expected: In the hero textarea, type a short funding announcement and submit. A graph should generate and appear. After success, an inline "Sign up to save" prompt should appear near the result.
result: issue
reported: "generates but does not show graph"
severity: major

## Summary

total: 9
passed: 7
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "PostHog initializes without triggering console.error when NEXT_PUBLIC_POSTHOG_KEY is not set"
  status: failed
  reason: "User reported: PostHog console.error fires on every page load: 'PostHog was initialized without a token'"
  severity: minor
  test: 1
  root_cause: "posthog.init() called unconditionally in useEffect — TypeScript ! operator provides no runtime guard; posthog receives undefined/empty string and fires console.error"
  artifacts:
    - path: "apps/web/app/providers.tsx"
      issue: "line 9: posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, ...) — no conditional guard, ! is TypeScript-only and erased at runtime"
  missing:
    - "Wrap posthog.init() in if (process.env.NEXT_PUBLIC_POSTHOG_KEY) { ... } to short-circuit when env var is absent"
  debug_session: ".planning/debug/posthog-console-error-missing-guard.md"

- truth: "After submitting text in the hero textarea, the generated graph renders visually on the landing page"
  status: failed
  reason: "User reported: generates but does not show graph"
  severity: major
  test: 9
  root_cause: "HeroSection stores only scalar counts (nodes: number, edges: number) after API success — the VCGraph object is discarded. No GraphCanvas import exists; success block renders a text badge only. Right column always shows static DemoGraph."
  artifacts:
    - path: "apps/web/components/landing/HeroSection.tsx"
      issue: "line 9: state type is { nodes: number; edges: number } — VCGraph never stored"
    - path: "apps/web/components/landing/HeroSection.tsx"
      issue: "lines 31-37: data.graph discarded after count extraction; setResult stores scalars only"
    - path: "apps/web/components/landing/HeroSection.tsx"
      issue: "lines 82-91: success block renders text badge; no GraphCanvas render path exists"
  missing:
    - "Replace { nodes, edges } state with VCGraph | null state"
    - "Store data.graph directly with setGraph(data.graph) in API success handler"
    - "Add dynamic(() => import('@/components/graph/GraphCanvas'), { ssr: false }) — mandatory to avoid SSR crash"
    - "Replace text-badge success block with GraphCanvas render in right column, replacing DemoGraph when result exists"
    - "Retain Sign up to save prompt as overlay/caption on canvas"
  debug_session: ".planning/debug/hero-graph-not-rendering.md"
