'use client'

import Link from 'next/link'

interface LandingNavProps {
  isAuthenticated?: boolean
}

export default function LandingNav({ isAuthenticated = false }: LandingNavProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="text-xl font-bold tracking-tight">Instagraph</span>
        </Link>

        {/* Auth-aware CTA */}
        {isAuthenticated ? (
          <Link
            href="/app"
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to app
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-md border border-gray-700 text-gray-300 text-sm font-medium hover:border-gray-500 hover:text-white transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}
