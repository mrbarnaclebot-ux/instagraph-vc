---
status: diagnosed
phase: 01-backend-foundation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md]
started: 2026-02-27T11:55:00Z
updated: 2026-02-27T12:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. API health endpoint
expected: Visit https://instagraph-api.onrender.com/health — returns {"status":"ok"}
result: pass

### 2. Auth rejection without token
expected: POST /api/generate without auth token — should return 401 with {"error": "unauthorized", "message": ...}
result: pass

### 3. Generate graph from text (authenticated via app)
expected: Sign in at https://instagraph-vc-web.vercel.app/sign-in, go to /app, paste a funding announcement like "Paradigm led a $50M Series A in Monad Labs, a high-performance L1 blockchain", submit. After loading, a graph should appear with colored nodes (investors, projects, rounds) and labeled edges.
result: issue
reported: "api error 400"
severity: major

### 4. Short text rejection
expected: In the /app page, type a very short input like "hello world" and submit. Should show an error toast — the backend rejects text under 200 characters.
result: issue
reported: "api error 503"
severity: major

### 5. URL input scraping
expected: In /app, paste a real funding article URL (e.g. a TechCrunch crypto funding article) and submit. The backend should scrape the URL, extract entities, and render a graph.
result: pass

### 6. SSRF protection on internal URLs
expected: In /app, paste "http://169.254.169.254/latest/meta-data/" and submit. Should show an error — the backend blocks internal/private IP URLs.
result: pass

## Summary

total: 6
passed: 4
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Graph appears with colored nodes and labeled edges after submitting funding announcement text"
  status: failed
  reason: "User reported: api error 400"
  severity: major
  test: 3
  root_cause: "Backend enforces 200-char minimum but the test example text is only 76 chars. Backend correctly returns 400 — the test prompt was too short, not a bug. Frontend lacks client-side validation and character counter to guide users."
  artifacts:
    - path: "apps/api/app/scraper/ssrf.py"
      issue: "validate_input_length() rejects <200 chars with 400 — working as designed"
    - path: "apps/web/components/input/InputCard.tsx"
      issue: "No minLength validation, no character counter — allows submission of any non-empty string"
  missing:
    - "Add client-side validation in InputCard.tsx: disable submit when text < 200 chars"
    - "Add live character counter on text textarea (e.g., 76/200 characters)"
  debug_session: ".planning/debug/api-400-graph-generation.md"

- truth: "Error toast shown when submitting short text under 200 characters"
  status: failed
  reason: "User reported: api error 503"
  severity: major
  test: 4
  root_cause: "Render free-tier service sleeps after 15 min inactivity. 503 returned by Render before FastAPI boots — backend validation logic is correct but never reached."
  artifacts:
    - path: "render.yaml"
      issue: "plan: free — causes 15-min sleep spindown"
    - path: "apps/web/lib/api.ts"
      issue: "503 falls back to unhelpful 'HTTP 503' message"
    - path: "apps/web/components/input/InputCard.tsx"
      issue: "No client-side min-length validation"
  missing:
    - "Add client-side validation in InputCard.tsx to reject text < 200 chars before hitting API"
    - "Improve frontend 503 error handling to show friendly 'service warming up' message"
    - "Consider keep-alive cron or Render plan upgrade to prevent cold starts"
  debug_session: ".planning/debug/short-text-503-error.md"
