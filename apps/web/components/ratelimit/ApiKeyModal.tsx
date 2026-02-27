'use client'

import { useState } from 'react'
import { getUserApiKey, setUserApiKey, clearUserApiKey } from '@/lib/apikey'

interface ApiKeyModalProps {
  onDismiss: () => void
  onKeySet: () => void
}

export default function ApiKeyModal({ onDismiss, onKeySet }: ApiKeyModalProps) {
  const existingKey = getUserApiKey()
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    const trimmed = key.trim()
    if (!trimmed.startsWith('sk-')) {
      setError('API key should start with "sk-"')
      return
    }
    setUserApiKey(trimmed)
    onKeySet()
  }

  function handleRemove() {
    clearUserApiKey()
    onKeySet()
  }

  // Mask existing key: show first 3 + last 4 chars
  const maskedKey = existingKey
    ? `${existingKey.slice(0, 6)}...${existingKey.slice(-4)}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-amber-400">
              <path d="M10 2l1.09 3.36h3.53l-2.86 2.08 1.09 3.36L10 8.72l-2.85 2.08 1.09-3.36L5.38 5.36h3.53L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">
            {existingKey ? 'Your API Key' : "You've used all your free generations today"}
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {existingKey
              ? 'Your OpenAI API key is currently active. You can remove it or replace it below.'
              : 'Enter your own OpenAI API key for unlimited generations. Your key is stored only in your browser and never sent to our servers for storage.'}
          </p>
        </div>

        {/* Existing key display */}
        {maskedKey && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <span className="text-sm text-gray-300 font-mono">{maskedKey}</span>
            <button
              onClick={handleRemove}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Remove
            </button>
          </div>
        )}

        {/* Input */}
        {!existingKey && (
          <div className="space-y-2">
            <input
              type="password"
              value={key}
              onChange={e => { setKey(e.target.value); setError(null) }}
              placeholder="sk-..."
              className="w-full rounded-xl bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            />
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Your key is stored only in your browser and never sent to our servers for storage.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!existingKey && (
            <button
              onClick={handleSave}
              disabled={!key.trim()}
              className="flex items-center justify-center w-full px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save Key
            </button>
          )}
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2.5 rounded-xl text-gray-400 text-sm hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            {existingKey ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
