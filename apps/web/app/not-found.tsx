import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-md">
        {/* Large muted 404 */}
        <div className="text-[10rem] font-black text-gray-800/60 font-mono leading-none tracking-tighter select-none">
          404
        </div>

        {/* Graph-themed node decorative */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
          <div className="flex-1 max-w-[60px] h-px bg-gradient-to-r from-indigo-500/50 to-gray-700" />
          <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
              <path d="M8 1L1 5v6l7 4 7-4V5L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 max-w-[60px] h-px bg-gradient-to-r from-gray-700 to-emerald-500/50" />
          <div className="w-3 h-3 rounded bg-emerald-500 shadow-lg shadow-emerald-500/50" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">Node not found</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            This page doesn&apos;t exist in the graph. It may have been removed or the link is broken.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            ← Back to home
          </Link>
          <Link
            href="/app"
            className="px-6 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:border-gray-500 hover:text-white transition-colors"
          >
            Open app →
          </Link>
        </div>
      </div>
    </div>
  )
}
