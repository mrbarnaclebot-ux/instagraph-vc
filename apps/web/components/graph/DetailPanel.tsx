'use client'

import { useState } from 'react'
import type { VCGraph, GraphNode } from '@graphvc/shared-types'

interface DetailPanelProps {
  graph: VCGraph
  selectedNodeId: string | null
  onNavigate: (nodeId: string) => void
  onClose: () => void
}

interface ConnectedNode {
  node: GraphNode
  relationship: string
  direction: 'outgoing' | 'incoming'
}

function CopyIcon({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API may be blocked in some contexts
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy value"
      className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-200 shrink-0"
    >
      {copied ? (
        <span className="text-xs text-green-400">✓</span>
      ) : (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4z"/>
          <path d="M6 0h7a3 3 0 0 1 3 3v7h-1V3a2 2 0 0 0-2-2H6V0z"/>
        </svg>
      )}
    </button>
  )
}

export default function DetailPanel({ graph, selectedNodeId, onNavigate, onClose }: DetailPanelProps) {
  const node = graph.nodes.find((n) => n.id === selectedNodeId) ?? null

  if (!node) return null

  // Find connected nodes from edges
  const connected: ConnectedNode[] = graph.edges
    .filter((e) => e.source === node.id || e.target === node.id)
    .map((e) => {
      const isOutgoing = e.source === node.id
      const connectedId = isOutgoing ? e.target : e.source
      const connectedNode = graph.nodes.find((n) => n.id === connectedId)
      if (!connectedNode) return null
      return {
        node: connectedNode,
        relationship: e.relationship,
        direction: isOutgoing ? 'outgoing' : 'incoming',
      } as ConnectedNode
    })
    .filter((c): c is ConnectedNode => c !== null)

  const properties = Object.entries(node.properties).filter(([, v]) => v !== null && v !== undefined && v !== '')

  const entityTypeColors: Record<string, string> = {
    Investor: 'text-indigo-400',
    Project: 'text-emerald-400',
    Round: 'text-amber-400',
    Narrative: 'text-violet-400',
    Person: 'text-pink-400',
  }

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-700">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${entityTypeColors[node.type] ?? 'text-gray-400'}`}>
            {node.type}
          </p>
          <h2 className="text-base font-semibold text-white leading-tight">{node.label}</h2>
        </div>
        <button
          onClick={onClose}
          title="Close panel"
          className="text-gray-400 hover:text-white transition-colors ml-3 shrink-0 mt-0.5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
          </svg>
        </button>
      </div>

      {/* Properties key-value table */}
      {properties.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Properties</p>
          <table className="w-full text-sm">
            <tbody>
              {properties.map(([key, value]) => (
                <tr key={key} className="group">
                  <td className="py-1 pr-3 text-gray-400 font-medium align-top whitespace-nowrap w-1/2">
                    {key.replace(/_/g, ' ')}
                  </td>
                  <td className="py-1 text-gray-200 align-top">
                    <div className="flex items-start">
                      <span className="break-all">{String(value)}</span>
                      <CopyIcon value={value} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Connected nodes — navigation hub */}
      {connected.length > 0 && (
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Connections</p>
          <ul className="space-y-1.5">
            {connected.map((c, i) => (
              <li key={`${c.node.id}-${i}`}>
                <button
                  onClick={() => onNavigate(c.node.id)}
                  className="w-full text-left flex items-center gap-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded px-2 py-1.5 transition-colors group"
                >
                  <span className={`shrink-0 text-xs font-mono ${entityTypeColors[c.node.type] ?? 'text-gray-400'}`}>
                    {c.direction === 'outgoing' ? '→' : '←'}
                  </span>
                  <span className="text-xs text-gray-500 font-mono shrink-0">{c.relationship}</span>
                  <span className="truncate">{c.node.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop: right overlay panel */}
      <aside className="hidden md:flex flex-col w-72 h-full border-l border-gray-700 bg-gray-900 overflow-hidden shrink-0">
        {panelContent}
      </aside>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 bg-gray-600 rounded-full" />
        </div>
        {panelContent}
      </div>
    </>
  )
}
