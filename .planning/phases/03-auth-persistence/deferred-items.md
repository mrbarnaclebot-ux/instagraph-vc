# Deferred Items — Phase 03 Auth Persistence

## Pre-existing TypeScript errors (out of scope)

**Discovered during:** 03-03 Task 2 typecheck
**File:** apps/web/components/graph/cytoscapeStyles.ts

Errors:
- `'shadow-blur'` not in Cytoscape Node|Edge|Core type (lines 45, 59, 73, 87, 108)
- `FontWeight` type mismatch for `"500"` (line 120)
- `"round-rectangle"` not assignable to Cytoscape edge line-style (line 125, should be `"roundrectangle"`)

These errors pre-existed before plan 03-03 and are unrelated to auth/token changes.
Recommend fixing in a dedicated refactor plan or during Phase 5 cleanup.
