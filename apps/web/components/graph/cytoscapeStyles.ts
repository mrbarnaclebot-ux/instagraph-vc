// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCytoscapeStylesheet(isMobile: boolean): any[] {
  const nodeFontSize = isMobile ? 14 : 11
  const nodePadding = isMobile ? '14px' : '10px'
  const nodeBorderWidth = isMobile ? 3 : 2
  const edgeFontSize = isMobile ? 10 : 8
  const edgeWidth = isMobile ? 2 : 1.5

  return [
    // Base node style — all nodes share these defaults
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': nodeFontSize,
        'font-weight': 600,
        'color': '#ffffff',
        'text-outline-width': 2,
        // 'label' value is deprecated but still the only way to auto-size
        // nodes to their text — no replacement API exists in Cytoscape 3.x
        'width': 'label',
        'height': 'label',
        'min-width': isMobile ? 50 : 40,
        'min-height': isMobile ? 50 : 40,
        'padding': nodePadding,
        'border-width': nodeBorderWidth,
        'border-opacity': 0.5,
        'text-max-width': isMobile ? '140px' : '120px',
        'text-wrap': 'wrap',
      },
    },

    // Entity-type node styles (FE-01 — locked colors/shapes)
    {
      selector: 'node[type = "Investor"]',
      style: {
        'background-color': '#6366f1',
        'shape': 'ellipse',
        'text-outline-color': '#4338ca',
        'border-color': '#818cf8',
        'underlay-color': '#6366f1',
        'underlay-padding': 4,
        'underlay-opacity': 0.25,
        'underlay-shape': 'ellipse',
      },
    },
    {
      selector: 'node[type = "Project"]',
      style: {
        'background-color': '#10b981',
        'shape': 'round-rectangle',
        'text-outline-color': '#047857',
        'border-color': '#34d399',
        'underlay-color': '#10b981',
        'underlay-padding': 4,
        'underlay-opacity': 0.25,
        'underlay-shape': 'round-rectangle',
      },
    },
    {
      selector: 'node[type = "Round"]',
      style: {
        'background-color': '#f59e0b',
        'shape': 'diamond',
        'text-outline-color': '#b45309',
        'border-color': '#fbbf24',
        'underlay-color': '#f59e0b',
        'underlay-padding': 4,
        'underlay-opacity': 0.25,
        'underlay-shape': 'ellipse',
      },
    },
    {
      selector: 'node[type = "Narrative"]',
      style: {
        'background-color': '#8b5cf6',
        'shape': 'hexagon',
        'text-outline-color': '#6d28d9',
        'border-color': '#a78bfa',
        'underlay-color': '#8b5cf6',
        'underlay-padding': 4,
        'underlay-opacity': 0.25,
        'underlay-shape': 'ellipse',
      },
    },
    {
      selector: 'node[type = "Person"]',
      style: {
        'background-color': '#ec4899',
        'shape': 'ellipse',
        'text-outline-color': '#be185d',
        'border-color': '#f472b6',
        'underlay-color': '#ec4899',
        'underlay-padding': 4,
        'underlay-opacity': 0.25,
        'underlay-shape': 'ellipse',
      },
    },

    // Dimmed state — non-neighbor nodes during selection
    {
      selector: '.dimmed',
      style: { 'opacity': 0.15 },
    },

    // Highlighted (selected) node — white ring + amplified glow
    {
      selector: '.highlighted',
      style: {
        'border-width': 3,
        'border-color': '#ffffff',
        'border-opacity': 1,
        'underlay-padding': 6,
        'underlay-opacity': 0.4,
      },
    },

    // Edge default — haystack for parallel edge separation
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': edgeFontSize,
        'font-weight': 500,
        'text-rotation': 'autorotate',
        'text-background-color': '#0f172a',
        'text-background-opacity': 0.85,
        'text-background-padding': '3px',
        'text-background-shape': 'round-rectangle',
        'line-color': '#374151',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#374151',
        'arrow-scale': 0.85,
        'width': edgeWidth,
        'color': '#6b7280',
        'control-point-step-size': 40,
      },
    },

    // CO_INVESTED edges — subtler to reduce visual clutter
    {
      selector: 'edge[label = "CO_INVESTED"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [4, 4],
        'line-color': '#4b5563',
        'target-arrow-shape': 'none',
        'width': Math.max(edgeWidth - 0.5, 0.75),
        'opacity': 0.5,
        'font-size': Math.max(edgeFontSize - 1, 6),
      },
    },

    // Dimmed edge
    {
      selector: 'edge.dimmed',
      style: { 'opacity': 0.05 },
    },
  ]
}

/** @deprecated Use getCytoscapeStylesheet(isMobile) instead */
export const cytoscapeStylesheet = getCytoscapeStylesheet(false)
