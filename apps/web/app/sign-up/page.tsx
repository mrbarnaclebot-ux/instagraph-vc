import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-base tracking-tight">
            Instagraph
          </Link>
          <Link
            href="/sign-in"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Already have an account?{' '}
            <span className="text-indigo-400 hover:text-indigo-300">Sign in</span>
          </Link>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Early Access
            </div>
            <h1 className="text-2xl font-bold text-white">Create an account</h1>
            <p className="text-gray-500 text-sm">
              Full sign-up is launching soon
            </p>
          </div>

          {/* Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            {/* Feature list */}
            <div className="space-y-2.5">
              {[
                { icon: '📊', label: 'Graph history', desc: 'Save and revisit every graph you generate' },
                { icon: '🔍', label: 'Saved searches', desc: 'Bookmark VC networks for ongoing tracking' },
                { icon: '👥', label: 'Team workspaces', desc: 'Share graphs with your team' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 text-sm">
                  <span className="text-base shrink-0">{f.icon}</span>
                  <div>
                    <span className="text-gray-300 font-medium">{f.label}</span>
                    <span className="text-gray-500"> — {f.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <Link
                href="/app"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
              >
                Try the app for free
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <p className="text-center text-gray-600 text-xs">
                No account needed · No credit card required
              </p>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
