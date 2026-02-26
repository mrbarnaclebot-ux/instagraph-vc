---
phase: 02-monorepo-vertical-slice
plan: 02
subsystem: ui
tags: [cytoscape, cytoscape-fcose, react-cytoscapejs, tailwind, graph-visualization, detail-panel]

# Dependency graph
requires:
  - phase: 02-monorepo-vertical-slice
    provides: apps/web Next.js 15 skeleton with @graphvc/shared-types workspace dependency and cytoscape packages pre-installed
provides:
  - Cytoscape canvas rendering VCGraph with 5 entity-type node shapes and colors (FE-01)
  - Neighborhood highlight on node click + canvas-tap deselect
  - Fit button for viewport reset
  - DetailPanel with entity header, key-value property table, copy-per-row, connected-node navigation, mobile bottom sheet
affects: [02-04-app-wiring, 03-graph-canvas-query]

# Tech tracking
tech-stack:
  added: [cytoscape-fcose, react-cytoscapejs, @radix-ui/react-tabs]
  patterns: [Cytoscape.use() at module level (not inside component), dynamic import with ssr:false required at page level, bezier edges for label support (not haystack)]

key-files:
  created:
    - apps/web/components/graph/cytoscapeStyles.ts
    - apps/web/components/graph/GraphCanvas.tsx
    - apps/web/components/graph/DetailPanel.tsx
  modified: []

key-decisions:
  - "Cytoscape.use(fcose) at module level — registering inside component causes re-registration on every render"
  - "bezier edges instead of haystack — haystack doesn't support labels; bezier with hideEdgesOnViewport gives same performance"
  - "fcose layout with animate:true, animationDuration:600 — nodes fly in as specified in CONTEXT.md"
  - "DetailPanel as desktop right-panel + mobile bottom sheet — responsive without duplicate components"
  - "onNavigate prop on DetailPanel enables connected-node navigation without lifting graph state"

patterns-established:
  - "Graph components pattern: cytoscapeStyles.ts (pure stylesheet) + GraphCanvas.tsx (canvas + interaction) + DetailPanel.tsx (selection view)"
  - "Dimming pattern: cy.elements().addClass('dimmed') then neighborhood.removeClass('dimmed') for neighborhood highlight"
  - "CopyIcon component: opacity-0 group-hover:opacity-100 pattern for per-row copy buttons"

requirements-completed: [FE-01, FE-02]

# Metrics
duration: ~8min
completed: 2026-02-26
---

# Phase 2 Plan 02: Cytoscape Canvas + Detail Panel Summary

**Cytoscape.js graph canvas with 5 VC entity node types (fcose layout, neighborhood highlight) and a responsive detail panel with property table, connected-node navigation, and mobile bottom sheet**

## Performance

- **Duration:** ~8 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `cytoscapeStyles.ts` — complete Cytoscape stylesheet with 5 entity types (Investor=indigo ellipse, Project=emerald rect, Round=amber diamond, Narrative=violet hexagon, Person=pink ellipse), edge labels, dimmed/highlighted states
- `GraphCanvas.tsx` — Cytoscape canvas with fcose animated layout, neighborhood dimming on node click, canvas-tap deselect, Fit button
- `DetailPanel.tsx` — entity header with type color, key-value property table with per-row copy buttons, connected-node navigation hub, responsive (desktop right panel + mobile bottom sheet)

## Task Commits

Each task was committed atomically:

1. **Task 1: cytoscapeStyles.ts** - `c911b87` (feat)
2. **Task 2: GraphCanvas.tsx** - `880f421` (feat)
3. **Task 3: DetailPanel.tsx** - `21baa0a` (feat)

## Files Created/Modified

- `apps/web/components/graph/cytoscapeStyles.ts` — Cytoscape.Stylesheet[] with 5 entity node types, bezier edges with labels, dimmed/highlighted states
- `apps/web/components/graph/GraphCanvas.tsx` — CytoscapeComponent wrapper with fcose layout, node tap/canvas tap handlers, Fit button
- `apps/web/components/graph/DetailPanel.tsx` — Selected node detail view: entity header, properties table with CopyIcon, connected nodes list with onNavigate

## Decisions Made

- bezier edges (not haystack) — haystack doesn't support labels; bezier + hideEdgesOnViewport satisfies both FE-01 performance requirement and CONTEXT.md edge-label lock
- `Cytoscape.use(fcose)` at module level — avoids re-registration on every component render
- Desktop right-panel + mobile bottom sheet via Tailwind responsive classes on the same component — no duplication
- `pixelRatio: 1` on CytoscapeComponent — reduces GPU load on retina displays without visible quality loss

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Graph canvas and detail panel ready for page wiring in Plan 02-04
- `GraphCanvasProps` interface: `{ graph: VCGraph, selectedNodeId: string | null, onNodeClick: (id: string | null) => void }`
- `DetailPanelProps` interface: `{ graph: VCGraph, selectedNodeId: string | null, onNavigate: (id: string) => void, onClose: () => void }`
- Dynamic import with `ssr: false` is REQUIRED when consuming GraphCanvas in a Next.js page

---
*Phase: 02-monorepo-vertical-slice*
*Completed: 2026-02-26*
