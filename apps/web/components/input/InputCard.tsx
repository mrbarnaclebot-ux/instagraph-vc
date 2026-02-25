'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { useState, useRef } from 'react'

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentInput.trim() || disabled) return
    onSubmit(currentInput.trim(), isUrl)
  }

  // Collapsed state: compact bar at top with truncated input and a "New" button
  if (collapsed) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={onExpand}
        title="Click to generate another graph"
      >
        <span className="text-xs text-gray-500 uppercase tracking-wide shrink-0">
          {isUrl ? 'URL' : 'Text'}
        </span>
        <span className="text-sm text-gray-400 truncate flex-1 min-w-0">{currentInput}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onExpand() }}
          className="shrink-0 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded transition-colors font-medium"
        >
          New
        </button>
      </div>
    )
  }

  // Expanded state: hero card
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Tab toggle */}
        <Tabs.Root
          value={mode}
          onValueChange={(v) => setMode(v as 'url' | 'text')}
          className="flex flex-col"
        >
          <Tabs.List className="flex border-b border-gray-700">
            <Tabs.Trigger
              value="url"
              className="flex-1 py-3 text-sm font-medium text-gray-400 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 transition-colors hover:text-gray-200"
            >
              URL
            </Tabs.Trigger>
            <Tabs.Trigger
              value="text"
              className="flex-1 py-3 text-sm font-medium text-gray-400 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 transition-colors hover:text-gray-200"
            >
              Text
            </Tabs.Trigger>
          </Tabs.List>

          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
            <Tabs.Content value="url">
              <input
                ref={inputRef}
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://techcrunch.com/2024/..."
                disabled={disabled}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              />
            </Tabs.Content>

            <Tabs.Content value="text">
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste a funding announcement, blog post, or article about a crypto VC deal..."
                disabled={disabled}
                rows={5}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none disabled:opacity-50"
              />
            </Tabs.Content>

            <button
              type="submit"
              disabled={disabled || !currentInput.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Generate Graph
            </button>
          </form>
        </Tabs.Root>
      </div>
    </div>
  )
}
