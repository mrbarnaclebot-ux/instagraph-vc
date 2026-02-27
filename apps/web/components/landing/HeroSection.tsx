'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { VCGraph } from '@graphvc/shared-types'
import DemoGraph from './DemoGraph'
import TrialModal from '@/components/auth/TrialModal'
import { isTrialUsed, markTrialUsed } from '@/lib/trial'

const GraphCanvas = dynamic(() => import('@/components/graph/GraphCanvas'), { ssr: false })

const NODE_LEGEND = [
  { color: '#6366f1', label: 'Investor' },
  { color: '#10b981', label: 'Project' },
  { color: '#f59e0b', label: 'Round' },
  { color: '#8b5cf6', label: 'Narrative' },
  { color: '#ec4899', label: 'Person' },
]

export default function HeroSection() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [graph, setGraph] = useState<VCGraph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTrialModal, setShowTrialModal] = useState(false)
  // trialBlocked: true after user dismisses the modal — input stays disabled
  const [trialBlocked, setTrialBlocked] = useState(false)

  function handleDismissTrialModal() {
    setShowTrialModal(false)
    setTrialBlocked(true)
  }

  async function handleTry(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading || trialBlocked) return

    // Trial gate: anonymous users get one free graph
    if (isTrialUsed()) {
      setShowTrialModal(true)
      return
    }

    setIsLoading(true)
    setError(null)
    setGraph(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message ?? 'Something went wrong. Try again.')
        return
      }
      const data = await res.json()
      const vcGraph: VCGraph = data.graph
      if (!vcGraph?.nodes?.length) {
        setError('No VC relationships found. Try a more specific funding announcement.')
        return
      }
      setGraph(vcGraph)
      // Mark trial as used after first successful generation
      markTrialUsed()
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
    <section className="relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 lg:pt-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left — headline + input */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              AI-powered VC graph intelligence
            </div>

            <div className="space-y-5">
              <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight">
                Map the crypto VC{' '}
                <span className="relative">
                  <span className="relative z-10 bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    network
                  </span>
                </span>
                {' '}in seconds
              </h1>
              <p className="text-base text-gray-400 max-w-lg leading-relaxed">
                Paste any funding announcement or URL. AI extracts investors, projects, rounds,
                and relationships — instantly visualized as an interactive knowledge graph.
              </p>
            </div>

            {/* Node type legend */}
            <div className="flex flex-wrap gap-3">
              {NODE_LEGEND.map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}88` }}
                  />
                  {label}
                </div>
              ))}
            </div>

            {/* Try it form */}
            <form onSubmit={handleTry} className="space-y-3">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={trialBlocked ? 'Sign up to generate more graphs' : 'Paste a funding announcement, article, or URL...'}
                  rows={4}
                  disabled={trialBlocked}
                  className="w-full rounded-xl bg-gray-900/80 border border-gray-700 text-gray-100 placeholder-gray-600 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading || trialBlocked}
                className="relative w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all overflow-hidden group"
              >
                <span className="relative z-10">
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Extracting&hellip;
                    </span>
                  ) : (
                    'Try it free \u2192'
                  )}
                </span>
              </button>
            </form>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-800/40">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-red-400 shrink-0 mt-0.5">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="text-red-400 text-sm leading-snug">{error}</p>
              </div>
            )}

            {/* Social proof / trust */}
            <p className="text-gray-600 text-xs">
              No account required to try &middot;{' '}
              <Link href="/sign-up" className="text-indigo-500 hover:text-indigo-400 transition-colors">
                Sign up free
              </Link>
              {' '}to save graphs
            </p>
          </div>

          {/* Right — graph preview */}
          <div className="hidden lg:flex lg:flex-col gap-3">
            <div
              className={[
                'h-[520px] rounded-2xl overflow-hidden border bg-gray-900/80 transition-all duration-700 relative',
                graph
                  ? 'border-indigo-600/40 shadow-2xl shadow-indigo-950/60'
                  : 'border-gray-800/80 shadow-2xl shadow-black/50',
              ].join(' ')}
            >
              {/* Corner glow when graph is shown */}
              {graph && (
                <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, transparent 50%)',
                }} />
              )}

              {isLoading && !graph && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-500">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border-2 border-gray-700" />
                    <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                  </div>
                  <span className="text-sm text-gray-400">Extracting relationships&hellip;</span>
                </div>
              )}
              {!isLoading && graph && (
                <GraphCanvas
                  graph={graph}
                  selectedNodeId={null}
                  onNodeClick={() => undefined}
                />
              )}
              {!isLoading && !graph && (
                <DemoGraph className="w-full h-full" />
              )}
            </div>

            {graph ? (
              <div className="flex items-center justify-between px-1">
                <p className="text-gray-400 text-xs">
                  <span className="text-white font-medium">{graph.nodes.length}</span>
                  <span className="text-gray-600"> nodes &middot; </span>
                  <span className="text-white font-medium">{graph.edges.length}</span>
                  <span className="text-gray-600"> relationships extracted</span>
                </p>
                <Link
                  href="/sign-up"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Save this graph &rarr;
                </Link>
              </div>
            ) : (
              <p className="text-center text-gray-700 text-xs">
                Interactive demo &middot; Click nodes to explore
              </p>
            )}
          </div>
        </div>
      </div>
    </section>

    {/* Trial modal — shown when anonymous user attempts second generation */}
    {showTrialModal && <TrialModal onDismiss={handleDismissTrialModal} />}
  </>
  )
}
