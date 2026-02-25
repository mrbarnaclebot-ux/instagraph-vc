# Phase 2: Monorepo + Vertical Slice - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold Turborepo with Next.js 15 and FastAPI co-located; deliver a working browser UI where a user can submit a URL or text and see an interactive Cytoscape graph — no authentication required. Node colors/shapes and error toast messages are specified in success criteria and are locked.

</domain>

<decisions>
## Implementation Decisions

### Input UI
- Tab toggle between "URL" and "Text" modes — tabs swap the input field type (URL input vs textarea)
- Hero-style centered layout — large centered card taking up the top portion of the page, product-first (like Perplexity / v0)
- After a graph is generated, the input area collapses to a compact bar at the top so the graph takes center stage
- Text tab placeholder: instructional copy — "Paste a funding announcement, blog post, or article about a crypto VC deal..."
- **Use the `frontend-design` skill when implementing the UI** — explicitly requested by user for high design quality

### Loading experience
- Sequential step labels that cycle through stages: "Fetching URL..." → "Extracting entities..." → "Building graph..." — not a single static message
- Nodes fly in with animation when graph data arrives (layout runs visibly)
- While loading: dark empty canvas is shown with a centered spinner — frames the space before the graph appears
- Cancel button is visible during loading — aborts the in-flight request so user can adjust input and retry

### Graph interactivity
- Free node dragging enabled — users can grab and reposition any node
- Scroll-to-zoom + drag-to-pan + a visible "fit" button to recenter the graph
- Clicking a node highlights its neighborhood (dims unconnected nodes and edges) AND opens the detail panel simultaneously
- Edge labels always visible by default — relationship types displayed on all edges, not hover-only

### Detail panel
- Key-value table layout — property name left column, value right column; easy to scan
- Panel also lists connected nodes with relationship type (e.g., "INVESTED_IN → Project X"), clickable to navigate to that connected node — panel is a navigation hub
- On mobile / narrow screens: panel becomes a bottom sheet (slides up from bottom) rather than a right overlay
- Copy icon per row on hover — small clipboard icon next to each value for easy copying of addresses, amounts, names

### Claude's Discretion
- Exact Cytoscape layout algorithm (cose, dagre, etc.) — whichever works best for VC graph topology
- Animation timing and easing curves for node fly-in
- Exact spacing, typography, and edge label font size
- Error state appearance inside the graph canvas area
- How the "fit" button is positioned on the canvas

</decisions>

<specifics>
## Specific Ideas

- Frontend design skill must be invoked when building the UI — user wants high design quality, not generic AI aesthetics
- Hero-centered input feel should reference polished AI tools (Perplexity, v0) — clean, not cluttered
- The detail panel should function as a navigation hub: clicking a connected node in the panel navigates to it (highlights it on graph + updates panel)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-monorepo-vertical-slice*
*Context gathered: 2026-02-25*
