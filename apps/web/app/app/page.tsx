'use client'

import { useAuth } from '@clerk/nextjs'
import dynamic from 'next/dynamic'
import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import InputCard from '@/components/input/InputCard'
import LoadingSteps from '@/components/input/LoadingSteps'
import DetailPanel from '@/components/graph/DetailPanel'
import ExportFAB from '@/components/graph/ExportFAB'
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
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="w-6 h-6 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <AppPageInner />
    </Suspense>
  )
}

function AppPageInner() {
  const { getToken } = useAuth()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState<Status>('idle')
  const [graph, setGraph] = useState<VCGraph | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [inputCollapsed, setInputCollapsed] = useState(false)
  const [lastInput, setLastInput] = useState<{ value: string; isUrl: boolean } | null>(null)
  const [cyInstance, setCyInstance] = useState<import('cytoscape').Core | null>(null)

  const controllerRef = useRef<AbortController | null>(null)

  // FE-03: load graph from history when navigated via ?session= param
  useEffect(() => {
    const sessionId = searchParams.get('session')
    if (!sessionId) return
    let cancelled = false
    ;(async () => {
      setStatus('loading')
      setInputCollapsed(true)
      try {
        const token = await getToken()
        const res = await fetch(`/api/generate/session/${sessionId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to load graph')
        const data = await res.json()
        if (!cancelled) {
          setGraph(data.graph)
          setStatus('success')
        }
      } catch {
        if (!cancelled) {
          toast.error('Could not load graph from history')
          setStatus('idle')
          setInputCollapsed(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(async (input: string, isUrl: boolean) => {
    // Abort any in-flight request
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    setLastInput({ value: input, isUrl })
    setStatus('loading')
    setInputCollapsed(true)
    setSelectedNodeId(null)

    try {
      const data = await generateGraph(input, controllerRef.current.signal, getToken)

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
  }, [getToken])

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort()
  }, [])

  const handleExpand = useCallback(() => {
    setInputCollapsed(false)
    setGraph(null)
    setStatus('idle')
    setSelectedNodeId(null)
    setCyInstance(null)
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
          <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-in-up">
            {/* Constellation: entity-type colored dots in a network pattern */}
            <div className="relative w-36 h-36">
              {/* Connecting lines */}
              <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 144 144">
                <line x1="72" y1="22" x2="118" y2="52" stroke="#6366f1" strokeWidth="0.75" />
                <line x1="118" y1="52" x2="100" y2="110" stroke="#8b5cf6" strokeWidth="0.75" />
                <line x1="100" y1="110" x2="44" y2="110" stroke="#f59e0b" strokeWidth="0.75" />
                <line x1="44" y1="110" x2="26" y2="52" stroke="#ec4899" strokeWidth="0.75" />
                <line x1="26" y1="52" x2="72" y2="22" stroke="#10b981" strokeWidth="0.75" />
                <line x1="72" y1="22" x2="100" y2="110" stroke="#374151" strokeWidth="0.5" />
                <line x1="26" y1="52" x2="118" y2="52" stroke="#374151" strokeWidth="0.5" />
              </svg>

              {/* Investor node (top) */}
              <div
                className="absolute w-3.5 h-3.5 rounded-full bg-indigo-500/70 shadow-[0_0_12px_3px_rgba(99,102,241,0.25)] animate-float"
                style={{ top: '16px', left: '64px' }}
              />
              {/* Project node (top-right) */}
              <div
                className="absolute w-3 h-3 rounded-sm bg-emerald-500/70 shadow-[0_0_12px_3px_rgba(16,185,129,0.25)] animate-float"
                style={{ top: '44px', right: '18px', animationDelay: '0.6s' }}
              />
              {/* Round node (bottom-right) */}
              <div
                className="absolute w-2.5 h-2.5 rotate-45 bg-amber-500/70 shadow-[0_0_12px_3px_rgba(245,158,11,0.25)] animate-float"
                style={{ bottom: '28px', right: '36px', animationDelay: '1.2s' }}
              />
              {/* Narrative node (bottom-left) */}
              <div
                className="absolute w-2.5 h-2.5 bg-violet-500/70 shadow-[0_0_12px_3px_rgba(139,92,246,0.25)] animate-float"
                style={{ bottom: '28px', left: '36px', animationDelay: '0.3s', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              />
              {/* Person node (top-left) */}
              <div
                className="absolute w-3 h-3 rounded-full bg-pink-500/70 shadow-[0_0_12px_3px_rgba(236,72,153,0.25)] animate-float"
                style={{ top: '44px', left: '18px', animationDelay: '0.9s' }}
              />
            </div>

            {/* Text */}
            <div className="text-center space-y-3">
              <p className="text-gray-400 text-sm font-medium">
                Paste a URL or text to map VC relationships
              </p>
              {/* Entity legend */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
                  Investors
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500/60" />
                  Projects
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rotate-45 bg-amber-500/60" />
                  Rounds
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500/60" />
                  People
                </span>
              </div>
            </div>
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
                onCyInit={setCyInstance}
              />
              <ExportFAB graph={graph} cyRef={cyInstance} />
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
