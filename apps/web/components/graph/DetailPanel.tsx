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
        <span className="text-xs text-emerald-400">✓</span>
      ) : (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4z"/>
          <path d="M6 0h7a3 3 0 0 1 3 3v7h-1V3a2 2 0 0 0-2-2H6V0z"/>
        </svg>
      )}
    </button>
  )
}

const entityBadgeColors: Record<string, string> = {
  Investor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  Project: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Round: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Narrative: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  Person: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
}

const entityAccentColors: Record<string, string> = {
  Investor: 'border-l-indigo-500/40',
  Project: 'border-l-emerald-500/40',
  Round: 'border-l-amber-500/40',
  Narrative: 'border-l-violet-500/40',
  Person: 'border-l-pink-500/40',
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

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/60">
        <div className="flex items-start justify-between mb-2.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${entityBadgeColors[node.type] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/25'}`}
          >
            {node.type}
          </span>
          <button
            onClick={onClose}
            title="Close panel"
            className="text-gray-500 hover:text-white transition-colors shrink-0 rounded-md hover:bg-gray-800/60 p-1 -m-1"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
            </svg>
          </button>
        </div>
        <h2 className="font-display text-base font-bold text-white leading-tight">{node.label}</h2>
      </div>

      {/* Properties */}
      {properties.length > 0 && (
        <div className="p-4 border-b border-gray-800/60">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">Properties</p>
          <div className="space-y-2">
            {properties.map(([key, value]) => (
              <div key={key} className="group flex items-start gap-2 text-sm">
                <span className="text-gray-500 font-medium text-xs pt-0.5 shrink-0 min-w-[5rem]">
                  {key.replace(/_/g, ' ')}
                </span>
                <div className="flex items-start flex-1 min-w-0">
                  <span className="text-gray-200 text-xs break-all">{String(value)}</span>
                  <CopyIcon value={value} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connections */}
      {connected.length > 0 && (
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">
            Connections
            <span className="ml-1.5 text-gray-600 normal-case tracking-normal font-normal">({connected.length})</span>
          </p>
          <ul className="space-y-1">
            {connected.map((c, i) => (
              <li key={`${c.node.id}-${i}`}>
                <button
                  onClick={() => onNavigate(c.node.id)}
                  className={`w-full text-left flex items-center gap-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg px-2.5 py-2 transition-all group border-l-2 ${entityAccentColors[c.node.type] ?? 'border-l-gray-600'}`}
                >
                  <span className="text-[10px] text-gray-600 font-mono shrink-0 w-3">
                    {c.direction === 'outgoing' ? '→' : '←'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono shrink-0 uppercase tracking-wide">
                    {c.relationship}
                  </span>
                  <span className="truncate text-xs">{c.node.label}</span>
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
      {/* Desktop: right panel with glass effect */}
      <aside className="hidden md:flex flex-col w-72 h-full bg-gray-900/80 backdrop-blur-xl border-l border-gray-800/60 overflow-hidden shrink-0 animate-slide-in-right">
        {panelContent}
      </aside>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-gray-900/90 backdrop-blur-xl border-t border-gray-800/60 rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto animate-slide-up-sheet">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 bg-gray-700 rounded-full" />
        </div>
        {panelContent}
      </div>
    </>
  )
}
