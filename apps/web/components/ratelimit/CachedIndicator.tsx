'use client'

interface CachedIndicatorProps {
  cacheAgeSeconds: number | null
  onRefresh: () => void
}

function formatAge(seconds: number): string {
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  return `${minutes} min ago`
}

export default function CachedIndicator({ cacheAgeSeconds, onRefresh }: CachedIndicatorProps) {
  if (cacheAgeSeconds === null) return null

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 bg-amber-900/20 border border-amber-800/30 rounded-full px-2 py-0.5">
      <span>Cached &mdash; scraped {formatAge(cacheAgeSeconds)}</span>
      <button
        onClick={onRefresh}
        title="Force refresh"
        className="text-amber-400/60 hover:text-amber-300 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M13.5 2.5v4h-4M2.5 13.5v-4h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.85 6A5 5 0 0113 5.7l.5.3M12.15 10A5 5 0 013 10.3l-.5-.3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </span>
  )
}
