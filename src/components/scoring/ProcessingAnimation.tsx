'use client'

import { useEffect, useState } from 'react'

const steps = [
  'Analyzing your pitch deck...',
  'Evaluating financials & metrics...',
  'Reviewing market opportunity...',
  'Scoring team & founders...',
  'Generating your Kunfa Score...',
]

interface ProcessingAnimationProps {
  onComplete: () => void
}

export default function ProcessingAnimation({ onComplete }: ProcessingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [showLargeDocHint, setShowLargeDocHint] = useState(false)

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 1
      })
    }, 150)

    return () => clearInterval(progressInterval)
  }, [])

  // After 10 seconds show a "this may take a while" hint
  useEffect(() => {
    const timer = setTimeout(() => setShowLargeDocHint(true), 10_000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval)
          return prev
        }
        return prev + 1
      })
    }, 3000)

    return () => clearInterval(stepInterval)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(onComplete, 500)
      return () => clearTimeout(timer)
    }
  }, [progress, onComplete])

  return (
    <div className="p-8 text-center">
      {/* Spinning loader */}
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
        <div
          className="absolute inset-0 rounded-full border-4 border-kunfa border-t-transparent animate-spin"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-kunfa-navy">{progress}%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 max-w-xs mx-auto">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 transition-all duration-500 ${
              i <= currentStep ? 'opacity-100' : 'opacity-30'
            }`}
          >
            {i < currentStep ? (
              <svg className="w-5 h-5 text-kunfa shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : i === currentStep ? (
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-kunfa rounded-full animate-pulse" />
              </div>
            ) : (
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full" />
              </div>
            )}
            <span className={`text-sm text-left ${i <= currentStep ? 'text-kunfa-navy font-medium' : 'text-gray-400'}`}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {showLargeDocHint && (
        <p className="mt-6 text-xs text-gray-400 animate-fade-in">
          Scoring in progress&hellip; This may take up to a minute for large documents.
        </p>
      )}
    </div>
  )
}
