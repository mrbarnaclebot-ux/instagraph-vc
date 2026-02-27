---
phase: 01-backend-foundation
plan: 06
subsystem: ui
tags: [validation, ux, error-handling, character-counter]

# Dependency graph
requires:
  - phase: 01-backend-foundation
    provides: "InputCard with text/URL tabs, HeroSection with trial flow, api.ts with GraphAPIError"
provides:
  - "Client-side 200-char minimum validation with live character counter on text inputs"
  - "Friendly 503 error message for Render cold starts in api.ts and HeroSection"
affects: [landing-page, app-input]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MIN_TEXT_LENGTH constant for client-side text validation"
    - "looksLikeUrl detection to bypass min-length for URL inputs"
    - "503 status guard with fallback message for non-JSON error bodies"

key-files:
  created: []
  modified:
    - apps/web/components/input/InputCard.tsx
    - apps/web/components/landing/HeroSection.tsx
    - apps/web/lib/api.ts

key-decisions:
  - "MIN_TEXT_LENGTH = 200 matches backend validate_input_length() threshold"
  - "URL inputs bypass min-length validation since backend treats them differently (scrape_url 500-char yield check)"
  - "503 override only triggers when detail.message equals generic 'HTTP 503' -- preserves real application 503s"

patterns-established:
  - "Client-side input validation mirrors backend thresholds for consistent UX"
  - "looksLikeUrl heuristic (http:// or https:// prefix) for URL vs text detection in single-textarea inputs"

requirements-completed: [AI-04, FE-05]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 01 Plan 06: UAT Gap Closure Summary

**Client-side 200-char minimum validation with live character counter and friendly 503 cold-start error messages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T12:25:48Z
- **Completed:** 2026-02-27T12:27:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- InputCard text tab shows live "{N} more characters needed" counter with submit disabled below 200 chars
- HeroSection textarea shows character counter for non-URL text inputs, with URL inputs bypassing validation
- Both api.ts (shared client) and HeroSection (direct fetch) convert 503 cold-start errors into "Service is warming up" message
- URL-mode validation in InputCard remains untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Add client-side 200-char minimum validation with character counter** - `6f1838c` (feat)
2. **Task 2: Add friendly 503 error message for Render cold starts** - `4bb1fa9` (fix)

**Plan metadata:** `fd5e115` (docs: complete plan)

## Files Created/Modified
- `apps/web/components/input/InputCard.tsx` - Added MIN_TEXT_LENGTH constant, textTooShort guard, character counter below textarea in text tab
- `apps/web/components/landing/HeroSection.tsx` - Added MIN_TEXT_LENGTH constant, looksLikeUrl detection, textTooShort guard, character counter, 503-specific error message
- `apps/web/lib/api.ts` - Added 503 status check with friendly warming-up message when JSON parsing fails

## Decisions Made
- MIN_TEXT_LENGTH = 200 matches the backend validate_input_length() threshold exactly
- URL inputs bypass the min-length validation: InputCard gates on `mode === 'text'`, HeroSection gates on `!looksLikeUrl`
- 503 override only fires when `detail.message === 'HTTP 503'` (the generic fallback), preserving real application 503 messages from OpenAI failures etc.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both UAT gaps (Test 3: API error 400, Test 4: API error 503) are now closed
- Client-side validation prevents short text from ever reaching the backend
- Friendly error messages improve UX during Render cold starts

---
*Phase: 01-backend-foundation*
*Completed: 2026-02-27*

## Self-Check: PASSED

- [x] InputCard.tsx exists with MIN_TEXT_LENGTH validation
- [x] HeroSection.tsx exists with MIN_TEXT_LENGTH validation and 503 handling
- [x] api.ts exists with 503 warming-up message
- [x] SUMMARY.md created
- [x] Commit 6f1838c verified
- [x] Commit 4bb1fa9 verified
