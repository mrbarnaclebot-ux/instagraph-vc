---
status: complete
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
  artifacts: []
  missing: []

- truth: "After submitting text in the hero textarea, the generated graph renders visually on the landing page"
  status: failed
  reason: "User reported: generates but does not show graph"
  severity: major
  test: 9
  artifacts: []
  missing: []
