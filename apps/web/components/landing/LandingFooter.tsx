'use client'

import { useState } from 'react'
import Link from 'next/link'

const SOLANA_CA = 'FCdTzUktGnZnED5Pj52sHz62hfw1o9LpVZPvsfmcpump'

export default function LandingFooter() {
  const year = new Date().getFullYear()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(SOLANA_CA)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <footer className="border-t border-gray-800 bg-gray-950">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Column 1: Brand + Attribution */}
          <div className="flex flex-col gap-2">
            <span className="text-white font-bold text-sm">Instagraph</span>
            <span className="text-sm text-gray-500">
              Built on{' '}
              <a
                href="https://github.com/yoheinakajima/instagraph"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                InstaGraph by Yohei Nakajima
              </a>
            </span>
          </div>

          {/* Column 2: Links */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-300">Links</span>
            <Link
              href="/privacy"
              className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              Terms of Service
            </Link>
          </div>

          {/* Column 3: Community */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-300">Community</span>
            <a
              href="https://github.com/yoheinakajima/instagraph"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
            <a
              href="https://x.com/i/communities/2026251129026392219"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
              </svg>
              Community
            </a>
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-sm">Solana</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors group"
              >
                <span className="font-mono text-xs truncate max-w-[160px]">
                  {SOLANA_CA}
                </span>
                {copied ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-400 shrink-0"
                  >
                    <path d="M3 8l3.5 3.5L13 5" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="shrink-0"
                  >
                    <rect x="5" y="5" width="9" height="9" rx="1.5" />
                    <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-gray-800/60 text-center text-xs text-gray-600">
          &copy; {year} Instagraph
        </div>
      </div>
    </footer>
  )
}
