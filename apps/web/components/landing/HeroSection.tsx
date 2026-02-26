'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { VCGraph } from '@graphvc/shared-types'
import DemoGraph from './DemoGraph'

const GraphCanvas = dynamic(() => import('@/components/graph/GraphCanvas'), { ssr: false })

export default function HeroSection() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [graph, setGraph] = useState<VCGraph | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleTry(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
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
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pt-20 pb-16 lg:pt-28">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left — headline + input */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
              Map the crypto VC network in seconds
            </h1>
            <p className="text-lg text-gray-400 max-w-lg">
              Paste any funding announcement or URL. AI extracts investors, projects, rounds, and relationships — instantly visualized as an interactive knowledge graph.
            </p>
          </div>

          {/* Anonymous trial input */}
          <form onSubmit={handleTry} className="space-y-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Paste a funding announcement, article, or URL..."
              rows={4}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-full rounded-lg bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Extracting...' : 'Try it free \u2192'}
            </button>
          </form>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        {/* Right — demo graph / live result graph */}
        <div className="hidden lg:flex lg:flex-col gap-3">
          <div
            className={[
              'h-[500px] rounded-xl overflow-hidden border bg-gray-900 transition-all duration-500',
              graph
                ? 'border-indigo-700/60 shadow-lg shadow-indigo-950/40'
                : 'border-gray-800',
            ].join(' ')}
          >
            {isLoading && !graph && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-500">
                <svg
                  className="animate-spin h-6 w-6 text-indigo-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm">Extracting relationships&hellip;</span>
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

          {graph && (
            <p className="text-gray-400 text-xs text-center leading-relaxed">
              <span className="text-gray-300 font-medium">
                {graph.nodes.length} nodes &middot; {graph.edges.length} relationships
              </span>
              {' — '}
              <a
                href="/sign-in"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                Sign up free
              </a>
              {' '}to save and revisit.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
