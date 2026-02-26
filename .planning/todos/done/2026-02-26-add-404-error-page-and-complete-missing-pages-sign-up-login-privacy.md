---
created: 2026-02-26T18:12:24.584Z
title: Add 404 error page and complete missing pages sign up login privacy
area: ui
files:
  - apps/web/app/not-found.tsx
  - apps/web/app/sign-up/page.tsx
  - apps/web/app/sign-in/page.tsx
  - apps/web/app/privacy/page.tsx
---

## Problem

Several pages are either missing or incomplete in the web app:

1. **404 / Not Found page** — no custom `not-found.tsx` exists; Next.js falls back to its default error UI which is unstyled and off-brand.
2. **Sign Up / Sign In pages** — Clerk auth pages may be using default Clerk-hosted UI rather than custom branded pages that match the app's design system.
3. **Privacy Policy page** — required for any public-facing product but likely missing or placeholder only.

These gaps make the app feel unpolished and incomplete for real users.

## Solution

1. Create `apps/web/app/not-found.tsx` — custom branded 404 page with navigation back to home.
2. Review Clerk sign-up/sign-in setup — if using Clerk's hosted pages, create custom `apps/web/app/sign-up/[[...sign-up]]/page.tsx` and `sign-in/[[...sign-in]]/page.tsx` using `<SignUp />` and `<SignIn />` components styled to match the app.
3. Create `apps/web/app/privacy/page.tsx` — a proper privacy policy page (content can be boilerplate/generated, but the page must exist and be linked from the footer).
4. Apply `frontend-design` skill aesthetics to all new pages for visual consistency.
