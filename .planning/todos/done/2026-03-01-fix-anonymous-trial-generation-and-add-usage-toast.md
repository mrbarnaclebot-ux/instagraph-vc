---
created: 2026-03-01T04:38:48.163Z
title: Fix anonymous trial generation and add usage toast
area: ui
files:
  - apps/web/components/landing/HeroSection.tsx
  - apps/web/lib/trial.ts
  - apps/web/app/app/page.tsx
  - apps/api/app/ratelimit/limiter.py
---

## Problem

Non-logged-in users report that the "try it for free" generation on the landing page does not work. Two issues:

1. **Anonymous trial generation broken** — needs investigation. Test with both URL input (https://techcrunch.com/2026/02/23/with-ai-investor-loyalty-is-almost-dead-at-least-a-dozen-openai-vcs-now-also-back-anthropic/) and text input to identify where it fails.

2. **Anonymous limit too low** — currently anonymous users get 1 generation/day (backend) + localStorage trial gate (frontend). User wants non-logged-in users to get **3 tries** before being prompted to sign up.

3. **Missing usage feedback** — after each successful generation, show a toast message telling the user how many tries they have remaining (e.g., "2 of 3 free generations remaining").

## Solution

1. Debug the anonymous generation flow end-to-end (HeroSection → /api/generate → backend without auth token)
2. Update `apps/api/app/ratelimit/limiter.py` anonymous limit from 1 to 3 per day
3. Update `apps/web/lib/trial.ts` to track count (not just boolean) — allow 3 uses before showing TrialModal
4. Add toast after each successful generation showing remaining count: "N of 3 free generations remaining"
5. Test with both URL and raw text input as anonymous user
