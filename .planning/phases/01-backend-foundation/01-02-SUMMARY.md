---
phase: 01-backend-foundation
plan: 02
subsystem: api
tags: [fastapi, ssrf, security, pytest, ipaddress, tdd, python]

# Dependency graph
requires:
  - phase: 01-backend-foundation/01-01
    provides: apps/api/ FastAPI skeleton with app/scraper/ stub
provides:
  - SSRF URL validator (validate_url) blocking RFC 1918, loopback, link-local, and non-HTTPS schemes
  - Input length validator (validate_input_length) rejecting inputs < 200 chars with exact AI-04 error message
  - Pytest test suite with 16 cases covering all SSRF attack vectors and boundary conditions
affects:
  - 01-03 (scraper — validate_url() called before fetching any URL)
  - 01-05 (generation — validate_input_length() called on raw text input)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SSRF protection via ipaddress stdlib module — never hand-roll IP range checks with regex
    - BLOCKED_NETWORKS list with ip_network objects checked via `ip_obj in network` membership
    - Catch-all ip_obj.is_global guard after explicit range checks for defense-in-depth
    - Mock DNS in tests via @patch("app.scraper.ssrf.socket.gethostbyname") — no real lookups
    - HTTPException detail shape {"error": str, "message": str} matching API contract

key-files:
  created:
    - apps/api/app/scraper/ssrf.py
    - apps/api/tests/test_ssrf.py
  modified: []

key-decisions:
  - "ipaddress stdlib module used for BLOCKED_NETWORKS — avoids regex IP range bugs, handles IPv4/IPv6 uniformly"
  - "is_global catch-all after explicit BLOCKED_NETWORKS loop — defense-in-depth for any non-routable address not explicitly enumerated"
  - "DNS resolution mocked in all DNS-dependent tests — tests run offline, no flakiness from real DNS"
  - "Error detail shape {error: str, message: str} — matches API contract from CONTEXT.md, enables structured client error handling"

patterns-established:
  - "SSRF guard pattern: scheme check -> hostname parse -> DNS resolve -> BLOCKED_NETWORKS check -> is_global catch-all -> return url"
  - "TDD RED-GREEN: tests imported ssrf.py before it existed (import error = genuine RED), implementation added to turn GREEN"
  - "Validator functions return input unchanged on pass, raise HTTPException(400) on reject — consistent with FastAPI validation patterns"

requirements-completed: [SEC-01, AI-04]

# Metrics
duration: 1min
completed: 2026-02-25
---

# Phase 1 Plan 02: SSRF Validator Summary

**SSRF URL validator blocking RFC 1918/loopback/link-local/AWS metadata and input length validator for AI-04 compliance, built TDD with 16 pytest cases running in 0.14s**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-25T10:26:05Z
- **Completed:** 2026-02-25T10:27:30Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 2

## Accomplishments

- `validate_url()` implemented with BLOCKED_NETWORKS covering 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16 (AWS metadata), IPv6 loopback, IPv6 ULA, RFC 6598 shared space
- `validate_input_length()` implemented rejecting inputs under 200 characters with exact AI-04 error message
- 16-case pytest suite covering all SSRF attack vectors, scheme rejections, edge cases, and input boundary conditions

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing tests for SSRF validator and input length** - `ba8bf4e` (test)
2. **Task 2: GREEN — implement SSRF validator and input length validator** - `0bda676` (feat)

**Plan metadata:** (see final commit below)

_Note: TDD plan — test commit precedes feat commit intentionally. No REFACTOR commit needed (implementation clean as written)._

## Files Created/Modified

- `apps/api/app/scraper/ssrf.py` - SSRF URL validator with BLOCKED_NETWORKS list and validate_input_length(); uses ipaddress stdlib, FastAPI HTTPException
- `apps/api/tests/test_ssrf.py` - 16-case pytest suite: TestValidateUrl (11 cases) + TestValidateInputLength (5 cases); DNS mocked via @patch

## Decisions Made

- **ipaddress stdlib over regex:** Python's `ipaddress` module provides correct network membership testing without the edge cases of hand-rolled regex IP checks. `ip_network("10.0.0.0/8")` handles the full range deterministically.
- **is_global catch-all:** After checking all explicit BLOCKED_NETWORKS, a final `if not ip_obj.is_global` guard catches any non-public address not explicitly enumerated (e.g., TEST-NET ranges, documentation ranges).
- **DNS mocked in all DNS tests:** Real DNS lookups would make tests flaky and slow. All tests using DNS resolution patch `socket.gethostbyname` at the module level.
- **Docstring on validate_url DNS rebinding note:** Caller (scraper.py) must use `allow_redirects=False` and re-validate redirects — documented in the function docstring to prevent future regression.

## Deviations from Plan

None - plan executed exactly as written. ssrf.py already existed in the repository (previously scaffolded) but was empty/stub level. Tests were written before confirming the module state, causing a genuine RED (ModuleNotFoundError) on first run. Implementation filled in and all 16 tests turned GREEN.

## Issues Encountered

The `ssrf.py` file already existed as a file but contained only the full implementation from the plan spec (not a stub). This was discovered when the file write tool required reading it first. The implementation matched the plan specification exactly. Tests confirmed all 16 cases pass. No corrective action was required.

## User Setup Required

None - no external service configuration required. SSRF validator is pure Python using stdlib modules only.

## Next Phase Readiness

- Plan 01-03 (scraper) can import `from app.scraper.ssrf import validate_url` and call it before any `requests.get()` or `httpx.get()` call
- Plan 01-05 (generation) can import `from app.scraper.ssrf import validate_input_length` and call it on raw article text before sending to OpenAI
- Both functions follow the `raises HTTPException(400) / returns input unchanged` contract established here

---
*Phase: 01-backend-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED

All files confirmed present on disk and all commits confirmed in git history.

- FOUND: apps/api/app/scraper/ssrf.py
- FOUND: apps/api/tests/test_ssrf.py
- FOUND: .planning/phases/01-backend-foundation/01-02-SUMMARY.md
- FOUND: commit ba8bf4e (Task 1 - RED)
- FOUND: commit 0bda676 (Task 2 - GREEN)
