'use client'

import { useState } from 'react'
import DemoGraph from './DemoGraph'

export default function HeroSection() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ nodes: number; edges: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleTry(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    setIsLoading(true)
    setError(null)
    setResult(null)

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
      const nodeCount = data.graph?.nodes?.length ?? 0
      const edgeCount = data.graph?.edges?.length ?? 0
      if (nodeCount === 0) {
        setError('No VC relationships found. Try a more specific funding announcement.')
        return
      }
      setResult({ nodes: nodeCount, edges: edgeCount })
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
              {isLoading ? 'Extracting...' : 'Try it free →'}
            </button>
          </form>

          {/* Inline result / error
              NOTE: Locked decision requires a sign-up modal in-place after trial (same Phase 3 AUTH-02 modal).
              Modal is not yet available — AUTH-02 is a Phase 3 deliverable.
              Phase 5 interim state: inline "Sign up to save" text prompt (no redirect, no modal).
              Phase 3 will replace this block with a modal trigger. */}
          {result && (
            <div className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-4">
              <p className="text-emerald-400 text-sm font-medium">
                Graph generated — {result.nodes} nodes, {result.edges} relationships
              </p>
              <p className="text-gray-400 text-xs mt-1">
                <a href="/sign-in" className="text-indigo-400 hover:text-indigo-300 underline">Sign up free</a> to save, search, and revisit your graphs.
              </p>
            </div>
          )}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        {/* Right — demo graph */}
        <div className="hidden lg:block h-[500px] rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
          <DemoGraph className="w-full h-full" />
        </div>
      </div>
    </section>
  )
}
