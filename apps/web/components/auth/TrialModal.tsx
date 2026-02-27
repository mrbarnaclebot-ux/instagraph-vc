'use client'

import Link from 'next/link'

interface TrialModalProps {
  onDismiss: () => void
}

export default function TrialModal({ onDismiss }: TrialModalProps) {
  return (
    // Full-screen overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-indigo-400">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4v4m0 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Free graph used</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            You&apos;ve used your free graph. Sign up to generate more — it only takes a few seconds.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/sign-up"
            className="flex items-center justify-center w-full px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
          >
            Sign Up — it&apos;s free
          </Link>
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2.5 rounded-xl text-gray-400 text-sm hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
