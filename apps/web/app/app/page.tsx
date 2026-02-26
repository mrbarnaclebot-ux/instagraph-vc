'use client'

import dynamic from 'next/dynamic'
import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import InputCard from '@/components/input/InputCard'
import LoadingSteps from '@/components/input/LoadingSteps'
import DetailPanel from '@/components/graph/DetailPanel'
import { generateGraph, GraphAPIError } from '@/lib/api'
import { captureGraphGenerated } from '@/lib/analytics'
import type { VCGraph } from '@graphvc/shared-types'

// CRITICAL: ssr:false required — react-cytoscapejs accesses window at module load time
const GraphCanvas = dynamic(
  () => import('@/components/graph/GraphCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="w-6 h-6 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin" />
      </div>
    ),
  }
)

type Status = 'idle' | 'loading' | 'success'

export default function AppPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [graph, setGraph] = useState<VCGraph | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [inputCollapsed, setInputCollapsed] = useState(false)
  const [lastInput, setLastInput] = useState<{ value: string; isUrl: boolean } | null>(null)

  const controllerRef = useRef<AbortController | null>(null)

  const handleSubmit = useCallback(async (input: string, isUrl: boolean) => {
    // Abort any in-flight request
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    setLastInput({ value: input, isUrl })
    setStatus('loading')
    setInputCollapsed(true)
    setSelectedNodeId(null)

    try {
      const data = await generateGraph(input, controllerRef.current.signal)

      // FE-05: empty graph check
      if (data.graph.nodes.length === 0) {
        toast.error('No VC relationships found')
        setStatus('idle')
        setInputCollapsed(false)
        return
      }

      setGraph(data.graph)
      setStatus('success')
      captureGraphGenerated(
        data.graph.nodes.length,
        data.graph.edges.length,
        input.trim().startsWith('https://') || input.trim().startsWith('http://') ? 'url' : 'text'
      )
    } catch (err) {
      // User cancelled — reset quietly, no toast
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle')
        setInputCollapsed(false)
        return
      }

      if (err instanceof GraphAPIError) {
        // FE-05: scrape failure specific toast
        if (err.isScrapeFailure) {
          toast.error("Couldn't read that URL — try pasting the text instead")
        } else {
          toast.error(err.message ?? 'Something went wrong')
        }
      } else {
        toast.error('Something went wrong. Please try again.')
      }

      setStatus('idle')
      setInputCollapsed(false)
    }
  }, [])

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort()
  }, [])

  const handleExpand = useCallback(() => {
    setInputCollapsed(false)
    setGraph(null)
    setStatus('idle')
    setSelectedNodeId(null)
  }, [])

  const handleNodeClick = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId)
  }, [])

  // Navigate to a connected node from the detail panel (CONTEXT.md: panel is a navigation hub)
  const handleNavigate = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* Input area: hero card (idle) or collapsed bar (loading/success) */}
      <InputCard
        collapsed={inputCollapsed}
        disabled={status === 'loading'}
        onSubmit={handleSubmit}
        onExpand={handleExpand}
      />

      {/* Main area: loading overlay, canvas, or empty state */}
      <div className="flex-1 relative overflow-hidden flex">
        {status === 'idle' && !graph && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600 text-sm">Enter a URL or paste text above to generate a graph</p>
          </div>
        )}

        {status === 'loading' && lastInput && (
          <div className="flex-1">
            <LoadingSteps
              isUrl={lastInput.isUrl}
              onCancel={handleCancel}
            />
          </div>
        )}

        {status === 'success' && graph && (
          <>
            <div className="flex-1 relative overflow-hidden">
              <GraphCanvas
                graph={graph}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleNodeClick}
              />
            </div>
            {selectedNodeId && (
              <DetailPanel
                graph={graph}
                selectedNodeId={selectedNodeId}
                onNavigate={handleNavigate}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
