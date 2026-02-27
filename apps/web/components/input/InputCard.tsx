'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { useState, useRef } from 'react'

const MIN_TEXT_LENGTH = 200

interface InputCardProps {
  collapsed: boolean
  disabled: boolean
  onSubmit: (input: string, isUrl: boolean) => void
  /** Called when user clicks the collapsed bar to re-expand */
  onExpand: () => void
}

export default function InputCard({ collapsed, disabled, onSubmit, onExpand }: InputCardProps) {
  const [mode, setMode] = useState<'url' | 'text'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const currentInput = mode === 'url' ? urlInput : textInput
  const isUrl = mode === 'url'
  const textTooShort = mode === 'text' && textInput.trim().length < MIN_TEXT_LENGTH

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentInput.trim() || disabled) return
    onSubmit(currentInput.trim(), isUrl)
  }

  // Collapsed state: sleek top bar with accent line and mono preview
  if (collapsed) {
    return (
      <div className="relative flex items-center gap-3 px-5 py-2.5 bg-gray-900/80 backdrop-blur-md border-b border-gray-800/60">
        {/* Left accent gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-indigo-500 to-violet-500" />

        <span className="font-mono text-[10px] text-indigo-400 uppercase tracking-widest shrink-0 font-semibold">
          {isUrl ? 'URL' : 'TXT'}
        </span>
        <span className="font-mono text-sm text-gray-400 truncate flex-1 min-w-0">{currentInput}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onExpand() }}
          className="shrink-0 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-full transition-all font-medium border border-gray-700 hover:border-gray-600"
        >
          + New
        </button>
      </div>
    )
  }

  // Expanded state: hero card with atmospheric glow
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-10 pb-4 animate-fade-in-up">
      <div className="relative">
        {/* Breathing glow layers behind card */}
        <div className="absolute -inset-6 bg-indigo-500/[0.06] rounded-3xl blur-2xl animate-breathe pointer-events-none" />
        <div
          className="absolute -inset-3 bg-violet-500/[0.04] rounded-3xl blur-xl animate-breathe pointer-events-none"
          style={{ animationDelay: '1.5s' }}
        />

        {/* Card */}
        <div className="relative bg-gray-900/90 backdrop-blur-sm border border-gray-800/80 rounded-2xl shadow-2xl shadow-indigo-950/30 overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <h1 className="font-display text-lg font-bold text-white tracking-tight">
              Generate Graph
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Paste a URL or text about a crypto VC deal
            </p>
          </div>

          <Tabs.Root
            value={mode}
            onValueChange={(v) => setMode(v as 'url' | 'text')}
            className="flex flex-col"
          >
            {/* Pill-style tab toggle */}
            <div className="px-5 pb-3">
              <Tabs.List className="flex gap-1 bg-gray-800/50 rounded-lg p-0.5">
                <Tabs.Trigger
                  value="url"
                  className="flex-1 py-1.5 text-xs font-semibold rounded-md text-gray-500 transition-all data-[state=active]:bg-gray-700/80 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  URL
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="text"
                  className="flex-1 py-1.5 text-xs font-semibold rounded-md text-gray-500 transition-all data-[state=active]:bg-gray-700/80 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  Text
                </Tabs.Trigger>
              </Tabs.List>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-5 flex flex-col gap-3">
              <Tabs.Content value="url">
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-indigo-500/50" />
                  <input
                    ref={inputRef}
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://techcrunch.com/2024/..."
                    disabled={disabled}
                    className="w-full bg-gray-800/40 border border-gray-700/50 rounded-lg pl-4 pr-3 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-gray-800/60 focus:shadow-[0_0_24px_-6px_rgba(99,102,241,0.15)] transition-all disabled:opacity-50"
                  />
                </div>
              </Tabs.Content>

              <Tabs.Content value="text">
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-violet-500/50" />
                  <textarea
                    ref={textareaRef}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste a funding announcement, blog post, or article about a crypto VC deal..."
                    disabled={disabled}
                    rows={5}
                    className="w-full bg-gray-800/40 border border-gray-700/50 rounded-lg pl-4 pr-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-gray-800/60 focus:shadow-[0_0_24px_-6px_rgba(139,92,246,0.15)] transition-all resize-none disabled:opacity-50"
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs px-1">
                  <span className={textInput.trim().length >= MIN_TEXT_LENGTH ? 'text-emerald-400/80' : 'text-amber-400/80'}>
                    {textInput.trim().length < MIN_TEXT_LENGTH
                      ? `${MIN_TEXT_LENGTH - textInput.trim().length} more characters`
                      : 'Ready'}
                  </span>
                  <span className="text-gray-600 font-mono text-[10px]">
                    {textInput.trim().length}/{MIN_TEXT_LENGTH}
                  </span>
                </div>
              </Tabs.Content>

              <button
                type="submit"
                disabled={disabled || !currentInput.trim() || textTooShort}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white font-semibold py-2.5 rounded-lg transition-all text-sm shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 disabled:shadow-none"
              >
                Generate Graph
              </button>
            </form>
          </Tabs.Root>
        </div>
      </div>
    </div>
  )
}
