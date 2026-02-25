'use client'

import CytoscapeComponent from 'react-cytoscapejs'
import Cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import { useRef, useCallback, useEffect } from 'react'
import { cytoscapeStylesheet } from './cytoscapeStyles'
import type { VCGraph } from '@graphvc/shared-types'

// Register fcose layout once at module level — NOT inside component (would re-register on every render)
Cytoscape.use(fcose as Cytoscape.Ext)

interface GraphCanvasProps {
  graph: VCGraph
  selectedNodeId: string | null
  onNodeClick: (nodeId: string | null) => void
}

export default function GraphCanvas({ graph, selectedNodeId, onNodeClick }: GraphCanvasProps) {
  const cyRef = useRef<Cytoscape.Core | null>(null)

  // When selectedNodeId changes externally (e.g., from detail panel navigation), sync highlight
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.elements().removeClass('dimmed highlighted')
    if (selectedNodeId) {
      const node = cy.getElementById(selectedNodeId)
      if (node.length > 0) {
        cy.elements().addClass('dimmed')
        node.neighborhood().add(node).removeClass('dimmed')
        node.addClass('highlighted')
      }
    }
  }, [selectedNodeId])

  const handleCyInit = useCallback((cy: Cytoscape.Core) => {
    cyRef.current = cy

    // Node tap: highlight neighborhood + open detail panel
    cy.on('tap', 'node', (evt) => {
      const node = evt.target as Cytoscape.NodeSingular
      cy.elements().removeClass('dimmed highlighted')
      cy.elements().addClass('dimmed')
      node.neighborhood().add(node).removeClass('dimmed')
      node.addClass('highlighted')
      onNodeClick(node.id())
    })

    // Background tap: remove dimming + close panel
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('dimmed highlighted')
        onNodeClick(null)
      }
    })
  }, [onNodeClick])

  const elements = [
    ...graph.nodes.map((n) => ({
      data: { id: n.id, label: n.label, type: n.type, ...n.properties },
    })),
    ...graph.edges.map((e) => ({
      data: { source: e.source, target: e.target, label: e.relationship },
    })),
  ]

  const handleFit = () => {
    cyRef.current?.fit(undefined, 40)
  }

  return (
    <div className="relative w-full h-full bg-gray-950">
      <CytoscapeComponent
        elements={elements}
        stylesheet={cytoscapeStylesheet}
        layout={{
          name: 'fcose',
          animate: true,
          animationDuration: 600,
          animationEasing: 'ease-out',
          fit: true,
          padding: 40,
          nodeDimensionsIncludeLabels: true,
        } as Cytoscape.LayoutOptions}
        cy={handleCyInit}
        style={{ width: '100%', height: '100%' }}
        pixelRatio={1}
        hideEdgesOnViewport={true}
      />
      {/* Fit button — positioned at bottom-right of canvas (CONTEXT.md decision) */}
      <button
        onClick={handleFit}
        title="Fit graph to viewport"
        className="absolute bottom-4 right-4 z-10 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
      >
        Fit
      </button>
    </div>
  )
}
