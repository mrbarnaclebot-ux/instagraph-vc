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
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/app"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-950/50"
            >
              Open app →
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-3 py-2 text-gray-400 text-sm font-medium hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/app"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-950/50"
              >
                Try free →
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
