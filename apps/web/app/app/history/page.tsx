'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HistoryCard from '@/components/history/HistoryCard'

interface GraphRow {
  id: string
  title: string
  source_url: string | null
  node_count: number
  edge_count: number
  neo4j_session_id: string
  created_at: string
}

export default function HistoryPage() {
  const [graphs, setGraphs] = useState<GraphRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/graphs')
      .then((r) => r.json())
      .then((data) => { setGraphs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = graphs.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = (id: string) => setGraphs((prev) => prev.filter((g) => g.id !== id))
  const handleRename = (id: string, title: string) =>
    setGraphs((prev) => prev.map((g) => (g.id === id ? { ...g, title } : g)))

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link href="/app" className="text-white font-bold text-base tracking-tight">
            Instagraph
          </Link>
          <Link href="/app" className="text-sm text-gray-400 hover:text-white transition-colors">
            &larr; Back to generator
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        {/* Header + search */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-white">Graph History</h1>
          <input
            type="text"
            placeholder="Search graphs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/50 w-48"
          />
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
                <div className="h-3 bg-gray-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-gray-600">
                <path d="M10 3a7 7 0 100 14A7 7 0 0010 3zM7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              {search ? 'No graphs match your search' : 'No graphs yet — generate your first one'}
            </p>
            {!search && (
              <Link href="/app" className="inline-block text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                Generate a graph &rarr;
              </Link>
            )}
          </div>
        )}

        {/* Card grid — 1 col mobile, 2 col tablet, 3 col desktop */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((graph) => (
              <HistoryCard
                key={graph.id}
                graph={graph}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
