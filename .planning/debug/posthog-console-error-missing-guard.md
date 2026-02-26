---
status: investigating
trigger: "Diagnose UAT issue: PostHog console.error fires on every page load when NEXT_PUBLIC_POSTHOG_KEY is not set"
created: 2026-02-26T00:00:00Z
updated: 2026-02-26T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: posthog.init() is called unconditionally with no guard for an empty/undefined token, causing posthog-js to fire a console.error when it receives an empty string
test: read providers.tsx to confirm absence of guard around init call
expecting: line 9 calls posthog.init with process.env.NEXT_PUBLIC_POSTHOG_KEY! and no conditional check
next_action: confirm root cause and return diagnosis

## Symptoms

expected: PostHog initializes without triggering console.error when NEXT_PUBLIC_POSTHOG_KEY is not set
actual: PostHog console.error fires on every page load: 'PostHog was initialized without a token'
errors: "PostHog was initialized without a token"
reproduction: load any page when NEXT_PUBLIC_POSTHOG_KEY env var is absent
started: phase 05-landing-page-observability implementation

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-26T00:00:00Z
  checked: apps/web/app/providers.tsx lines 1-17
  found: posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, { ... }) on line 9 inside useEffect with no conditional guard around the call
  implication: when NEXT_PUBLIC_POSTHOG_KEY is undefined/empty, posthog.init receives an empty string (due to the non-null assertion operator !) and posthog-js internally validates the token and fires console.error

## Resolution

root_cause: Line 9 of apps/web/app/providers.tsx calls posthog.init() unconditionally inside useEffect. The non-null assertion operator (!) suppresses TypeScript's undefined warning but does not prevent the call from executing. When NEXT_PUBLIC_POSTHOG_KEY is absent from the environment, process.env.NEXT_PUBLIC_POSTHOG_KEY evaluates to undefined (coerced to an empty string by posthog-js), which posthog-js detects as an invalid token and logs console.error('PostHog was initialized without a token').
fix: (investigation only - no fix applied)
verification: (investigation only)
files_changed: []
