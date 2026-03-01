'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: 'https://us.i.posthog.com',
        capture_pageview: false, // App Router navigation not detected by legacy pageview tracker
      })
      setReady(true)
    }
  }, [])

  if (!ready) return <>{children}</>

  return <PHProvider client={posthog}>{children}</PHProvider>
}
