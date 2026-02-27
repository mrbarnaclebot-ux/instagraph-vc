'use client'

import { useEffect, useState } from 'react'
import { getUserApiKey, clearUserApiKey } from '@/lib/apikey'

interface UsageCounterProps {
  getToken: () => Promise<string | null>
  refreshKey?: number
}

interface UsageData {
  used: number
  limit: number
  reset: number
}

export default function UsageCounter({ getToken, refreshKey = 0 }: UsageCounterProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    setHasApiKey(!!getUserApiKey())

    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const res = await fetch('/api/usage', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const data: UsageData = await res.json()
        if (!cancelled) setUsage(data)
      } catch {
        // Silently fail — counter is non-critical UI
      }
    })()
    return () => { cancelled = true }
  }, [getToken, refreshKey])

  // Don't render anything while loading
  if (!usage && !hasApiKey) return null

  if (hasApiKey) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Unlimited (using your API key)</span>
        <button
          onClick={() => {
            clearUserApiKey()
            setHasApiKey(false)
          }}
          className="text-gray-600 hover:text-gray-400 underline underline-offset-2 transition-colors"
        >
          clear
        </button>
      </div>
    )
  }

  if (!usage) return null

  return (
    <div className="text-xs text-gray-500" title="Resets at midnight UTC">
      {usage.used} of {usage.limit} generations used today
    </div>
  )
}
