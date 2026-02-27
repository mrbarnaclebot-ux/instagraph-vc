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
  onCyInit?: (cy: Cytoscape.Core) => void // Exposes cy instance to parent for export
}

export default function GraphCanvas({ graph, selectedNodeId, onNodeClick, onCyInit }: GraphCanvasProps) {
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
    onCyInit?.(cy)

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
  }, [onNodeClick, onCyInit])

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
      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #4b5563 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
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
      {/* Entity legend — bottom-left */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 bg-gray-900/70 backdrop-blur-sm border border-gray-800/50 rounded-lg px-3 py-2">
        {[
          { label: 'Investor', color: 'bg-indigo-500' },
          { label: 'Project', color: 'bg-emerald-500' },
          { label: 'Round', color: 'bg-amber-500' },
          { label: 'Person', color: 'bg-pink-500' },
        ].map((t) => (
          <span key={t.label} className="flex items-center gap-1 text-[9px] text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full ${t.color}/70`} />
            {t.label}
          </span>
        ))}
      </div>

      {/* Fit button — stacked above ExportFAB which sits at bottom-4 right-4 */}
      <div className="absolute bottom-14 right-4 z-10 flex items-center gap-px bg-gray-900/70 backdrop-blur-sm border border-gray-800/50 rounded-lg overflow-hidden">
        <button
          onClick={handleFit}
          title="Fit graph to viewport"
          className="hover:bg-gray-800/80 text-gray-400 hover:text-white px-3 py-2 text-xs font-medium transition-all flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
          </svg>
          Fit
        </button>
      </div>
    </div>
  )
}
