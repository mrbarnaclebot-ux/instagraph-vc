'use client'

import { useState, useEffect } from 'react'

const LOADING_STEPS = [
  'Fetching URL...',
  'Extracting entities...',
  'Building graph...',
] as const

interface LoadingStepsProps {
  /** Whether to show URL-specific first step (vs text input which skips "Fetching URL") */
  isUrl: boolean
  onCancel: () => void
}

export default function LoadingSteps({ isUrl, onCancel }: LoadingStepsProps) {
  const steps = isUrl ? LOADING_STEPS : LOADING_STEPS.slice(1) as unknown as typeof LOADING_STEPS
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    setStepIndex(0)
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [steps.length])

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-950 gap-8">
      {/* Sonar rings */}
      <div className="relative w-24 h-24">
        {/* Pulsing ring layers */}
        <div
          className="absolute inset-0 rounded-full border border-indigo-500/30 animate-sonar"
        />
        <div
          className="absolute inset-2 rounded-full border border-violet-500/25 animate-sonar"
          style={{ animationDelay: '0.4s' }}
        />
        <div
          className="absolute inset-4 rounded-full border border-indigo-400/20 animate-sonar"
          style={{ animationDelay: '0.8s' }}
        />

        {/* Static inner ring */}
        <div className="absolute inset-[26px] rounded-full border border-gray-800" />

        {/* Center core */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_16px_4px_rgba(99,102,241,0.4)]" />
        </div>
      </div>

      {/* Step label */}
      <p
        key={stepIndex}
        className="text-sm text-gray-300 font-medium tracking-wide animate-fade-in-up"
      >
        {steps[stepIndex]}
      </p>

      {/* Step progression dots with connecting lines */}
      <div className="flex items-center gap-0">
        {steps.map((_, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                i <= stepIndex
                  ? 'bg-indigo-500 shadow-[0_0_8px_2px_rgba(99,102,241,0.3)] scale-100'
                  : 'bg-gray-700 scale-75'
              }`}
            />
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-[1px] transition-colors duration-500 ${
                  i < stepIndex ? 'bg-indigo-500/40' : 'bg-gray-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
