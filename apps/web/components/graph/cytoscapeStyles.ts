// Shadow properties are valid cytoscape.js CSS but missing from @types/cytoscape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cytoscapeStylesheet: any[] = [
  // Base node style — all nodes share these defaults
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 11,
      'font-weight': 600,
      'color': '#ffffff',
      'text-outline-width': 2,
      'width': 'label',
      'height': 'label',
      'padding': '10px',
      'border-width': 2,
      'border-opacity': 0.5,
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
      'shadow-blur': 18,
      'shadow-color': '#6366f1',
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,
      'shadow-opacity': 0.55,
    },
  },
  {
    selector: 'node[type = "Project"]',
    style: {
      'background-color': '#10b981',
      'shape': 'round-rectangle',
      'text-outline-color': '#047857',
      'border-color': '#34d399',
      'shadow-blur': 18,
      'shadow-color': '#10b981',
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,
      'shadow-opacity': 0.55,
    },
  },
  {
    selector: 'node[type = "Round"]',
    style: {
      'background-color': '#f59e0b',
      'shape': 'diamond',
      'text-outline-color': '#b45309',
      'border-color': '#fbbf24',
      'shadow-blur': 18,
      'shadow-color': '#f59e0b',
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,
      'shadow-opacity': 0.55,
    },
  },
  {
    selector: 'node[type = "Narrative"]',
    style: {
      'background-color': '#8b5cf6',
      'shape': 'hexagon',
      'text-outline-color': '#6d28d9',
      'border-color': '#a78bfa',
      'shadow-blur': 18,
      'shadow-color': '#8b5cf6',
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,
      'shadow-opacity': 0.55,
    },
  },
  {
    selector: 'node[type = "Person"]',
    style: {
      'background-color': '#ec4899',
      'shape': 'ellipse',
      'text-outline-color': '#be185d',
      'border-color': '#f472b6',
      'shadow-blur': 18,
      'shadow-color': '#ec4899',
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,
      'shadow-opacity': 0.55,
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
      'shadow-blur': 28,
      'shadow-opacity': 0.85,
    },
  },

  // Edge default
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': 8,
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
      'width': 1.5,
      'color': '#6b7280',
    },
  },

  // Dimmed edge
  {
    selector: 'edge.dimmed',
    style: { 'opacity': 0.05 },
  },
]
