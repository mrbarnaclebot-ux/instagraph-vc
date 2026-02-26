---
status: diagnosed
trigger: "UAT gap: hero textarea submits, graph generates but does not show"
created: 2026-02-26T00:00:00Z
updated: 2026-02-26T00:00:00Z
---

## Current Focus

hypothesis: HeroSection stores only aggregate counts (nodes/edges) after API call — never stores the full VCGraph object and never renders GraphCanvas
test: read HeroSection state shape and post-success render path
expecting: confirmed — state type is { nodes: number; edges: number } not VCGraph
next_action: RESOLVED — root cause confirmed, returning diagnosis

## Symptoms

expected: After submitting text in the hero textarea, the generated graph renders visually on the landing page
actual: Graph data is generated (API call succeeds) but no graph canvas appears — only a text count badge
errors: none (no error state, silent visual omission)
reproduction: Submit any funding text in the HeroSection textarea
started: phase 05 implementation — HeroSection was built this phase

## Eliminated

- hypothesis: API call fails or returns no data
  evidence: setResult is called with nodeCount/edgeCount from data.graph.nodes.length — data is present
  timestamp: 2026-02-26

- hypothesis: GraphCanvas has a rendering bug
  evidence: GraphCanvas is not imported or rendered in HeroSection at all; it works fine in AppPage
  timestamp: 2026-02-26

## Evidence

- timestamp: 2026-02-26
  checked: HeroSection.tsx line 9
  found: state type is `{ nodes: number; edges: number } | null` — stores only scalar counts, not the VCGraph object
  implication: The full graph data is discarded after the API response; only counts are retained

- timestamp: 2026-02-26
  checked: HeroSection.tsx lines 30-37
  found: After API success, code extracts nodeCount and edgeCount, then calls `setResult({ nodes: nodeCount, edges: edgeCount })` — the `data.graph` object itself is never stored
  implication: No graph data available to pass to any rendering component

- timestamp: 2026-02-26
  checked: HeroSection.tsx lines 82-91 (result render block)
  found: When `result` is truthy, renders a styled div with text: "Graph generated — X nodes, Y relationships" plus a sign-up link. No GraphCanvas, no graph component, no visual graph.
  implication: The UI intentionally (by implementation) shows a text badge, not a graph canvas

- timestamp: 2026-02-26
  checked: HeroSection.tsx lines 4, 97-100
  found: DemoGraph is imported and rendered in the right column (static demo). No dynamic import of GraphCanvas exists anywhere in HeroSection.
  implication: HeroSection has no mechanism to render a real generated graph

- timestamp: 2026-02-26
  checked: apps/web/app/app/page.tsx lines 14-24, 29, 58-59, 136-144
  found: AppPage stores `graph` as `VCGraph | null`, dynamically imports GraphCanvas with `ssr:false`, and renders `<GraphCanvas graph={graph} ... />` when status === 'success'
  implication: The working pattern requires: (1) VCGraph state, (2) dynamic import of GraphCanvas, (3) conditional render passing full graph to GraphCanvas

- timestamp: 2026-02-26
  checked: apps/web/components/graph/GraphCanvas.tsx props interface (line 13-17)
  found: GraphCanvas requires `graph: VCGraph`, `selectedNodeId: string | null`, `onNodeClick: (nodeId: string | null) => void`
  implication: Fix must store full VCGraph and provide all three props

## Resolution

root_cause: HeroSection discards the full API response graph object, storing only scalar counts. It never imports or renders GraphCanvas. On success, it shows only a text badge ("Graph generated — N nodes, Y relationships"), not a visual graph.

fix: NOT APPLIED (investigation-only mode)

verification: NOT APPLICABLE

files_changed: []
