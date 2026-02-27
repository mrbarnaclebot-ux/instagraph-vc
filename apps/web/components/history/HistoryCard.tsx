'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface GraphRow {
  id: string
  title: string
  source_url: string | null
  node_count: number
  edge_count: number
  neo4j_session_id: string
  created_at: string
}

interface HistoryCardProps {
  graph: GraphRow
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function HistoryCard({ graph, onDelete, onRename }: HistoryCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(graph.title)
  const [isDeleting, setIsDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Per CONTEXT.md: clicking history card navigates to /app?session=<neo4j_session_id>
  const handleCardClick = () => {
    if (!isEditing) {
      router.push(`/app?session=${graph.neo4j_session_id}`)
    }
  }

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation()  // Don't navigate while editing title
    setIsEditing(true)
    setEditTitle(graph.title)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  const handleRenameSubmit = async () => {
    const trimmed = editTitle.trim()
    if (!trimmed || trimmed === graph.title) {
      setIsEditing(false)
      setEditTitle(graph.title)
      return
    }

    try {
      const res = await fetch(`/api/graphs/${graph.id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })
      if (!res.ok) throw new Error('Failed to rename')
      onRename(graph.id, trimmed)
      setIsEditing(false)
    } catch {
      toast.error('Failed to rename graph')
      setEditTitle(graph.title)
      setIsEditing(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/graphs/${graph.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      onDelete(graph.id)
    } catch {
      toast.error('Failed to delete graph')
      setIsDeleting(false)
    }
  }

  // Truncate source_url or show text preview label
  const preview = graph.source_url
    ? graph.source_url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)
    : 'Text input'

  return (
    <div
      onClick={handleCardClick}
      className="group bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-700 hover:bg-gray-800/50 transition-all space-y-3"
    >
      {/* Title — click to edit inline */}
      <div onClick={handleTitleClick}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') { setIsEditing(false); setEditTitle(graph.title) }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-gray-800 border border-indigo-500/50 rounded-lg px-2 py-1 text-sm font-semibold text-white outline-none focus:border-indigo-500"
            autoFocus
          />
        ) : (
          <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 hover:text-indigo-300 transition-colors">
            {graph.title}
          </h3>
        )}
      </div>

      {/* Source preview */}
      <p className="text-xs text-gray-500 truncate">{preview}</p>

      {/* Stats + timestamp + delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded-full">
            {graph.node_count} nodes · {graph.edge_count} edges
          </span>
          <span className="text-xs text-gray-600">{relativeTime(graph.created_at)}</span>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10"
          aria-label="Delete graph"
        >
          {isDeleting ? (
            <div className="w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
