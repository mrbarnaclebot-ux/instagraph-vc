'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: 'https://us.i.posthog.com',
        defaults: '2026-01-30',
        capture_pageview: false, // App Router navigation not detected by legacy pageview tracker
      })
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
