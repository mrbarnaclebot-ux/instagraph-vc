import type Cytoscape from 'cytoscape'

export const cytoscapeStylesheet: Cytoscape.StylesheetStyle[] = [
  // Base node style
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 11,
      'color': '#ffffff',
      'text-outline-width': 1.5,
      'width': 'label',
      'height': 'label',
      'padding': '8px',
    },
  },
  // Entity-type node styles (FE-01 requirement — locked colors/shapes)
  {
    selector: 'node[type = "Investor"]',
    style: {
      'background-color': '#6366f1',
      'shape': 'ellipse',
      'text-outline-color': '#6366f1',
    },
  },
  {
    selector: 'node[type = "Project"]',
    style: {
      'background-color': '#10b981',
      'shape': 'rectangle',
      'text-outline-color': '#10b981',
    },
  },
  {
    selector: 'node[type = "Round"]',
    style: {
      'background-color': '#f59e0b',
      'shape': 'diamond',
      'text-outline-color': '#f59e0b',
    },
  },
  {
    selector: 'node[type = "Narrative"]',
    style: {
      'background-color': '#8b5cf6',
      'shape': 'hexagon',
      'text-outline-color': '#8b5cf6',
    },
  },
  {
    selector: 'node[type = "Person"]',
    style: {
      'background-color': '#ec4899',
      'shape': 'ellipse',
      'text-outline-color': '#ec4899',
    },
  },
  // Dimmed state for neighborhood highlight (opacity 0.2 for non-neighbors)
  {
    selector: '.dimmed',
    style: { 'opacity': 0.2 },
  },
  // Highlighted (selected) node — brighter border
  {
    selector: '.highlighted',
    style: {
      'border-width': 3,
      'border-color': '#ffffff',
      'border-opacity': 0.9,
    },
  },
  // Edge default — bezier with visible labels (NOT haystack — haystack ignores labels)
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': 9,
      'text-rotation': 'autorotate',
      'text-background-color': '#111827',
      'text-background-opacity': 0.7,
      'text-background-padding': '2px',
      'line-color': '#4b5563',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#4b5563',
      'width': 1.5,
      'color': '#9ca3af',
    },
  },
  // Dimmed edge
  {
    selector: 'edge.dimmed',
    style: { 'opacity': 0.1 },
  },
]
