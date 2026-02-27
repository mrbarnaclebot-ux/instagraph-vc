'use client'

import { useCallback } from 'react'
import type Cytoscape from 'cytoscape'
import type { VCGraph } from '@graphvc/shared-types'
import { exportGraphAsJson, exportGraphAsPng } from '@/lib/export'

interface ExportFABProps {
  graph: VCGraph
  cyRef: Cytoscape.Core | null
  title?: string // For filename generation
}

/**
 * Floating action buttons for JSON and PNG graph export.
 * Positioned absolute bottom-right inside a relative container (sibling to GraphCanvas).
 * Only renders when cyRef is available (graph is rendered).
 * One-click instant download -- no intermediary modal or popover.
 */
export default function ExportFAB({ graph, cyRef, title }: ExportFABProps) {
  const handleExportJson = useCallback(() => {
    exportGraphAsJson(graph, title)
  }, [graph, title])

  const handleExportPng = useCallback(() => {
    if (cyRef) exportGraphAsPng(cyRef, graph, title)
  }, [cyRef, graph, title])

  if (!cyRef) return null

  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-px bg-gray-900/70 backdrop-blur-sm border border-gray-800/50 rounded-lg overflow-hidden">
      <button
        onClick={handleExportJson}
        title="Export as JSON"
        className="hover:bg-gray-800/80 text-gray-400 hover:text-white px-3 py-2 text-xs font-medium transition-all flex items-center gap-1.5"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 1v3a1 1 0 0 1-1 1H1M13 15V5l-4-4H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1z" />
        </svg>
        JSON
      </button>
      <button
        onClick={handleExportPng}
        title="Export as PNG"
        className="hover:bg-gray-800/80 text-gray-400 hover:text-white px-3 py-2 text-xs font-medium transition-all flex items-center gap-1.5"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="1" width="14" height="14" rx="2" />
          <circle cx="5" cy="5.5" r="1.5" />
          <path d="M15 10l-3.5-3.5L4 14h10a1 1 0 0 0 1-1v-3z" />
        </svg>
        PNG
      </button>
    </div>
  )
}
