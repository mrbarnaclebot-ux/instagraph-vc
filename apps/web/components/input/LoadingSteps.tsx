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
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-950 gap-6">
      {/* Spinner */}
      <div className="relative">
        <div className="w-10 h-10 border-2 border-gray-700 rounded-full" />
        <div className="absolute inset-0 w-10 h-10 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin" />
      </div>

      {/* Current step label */}
      <p className="text-sm text-gray-400 font-medium min-h-[1.25rem] text-center">
        {steps[stepIndex]}
      </p>

      {/* Step dots */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              i === stepIndex ? 'bg-indigo-500' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
