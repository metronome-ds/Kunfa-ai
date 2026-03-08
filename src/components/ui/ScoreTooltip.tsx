'use client'

import { useState, useRef, useEffect } from 'react'

const METHODOLOGY_TEXT =
  'Kunfa Score evaluates startups across four dimensions \u2014 Team & Founders, Market Opportunity, Product & Technology, and Financial Health \u2014 using AI analysis of your pitch materials. Scoring weights are adjusted by company stage: early-stage companies are weighted toward team strength and market opportunity, while later-stage companies are weighted toward financial performance and traction. Scores range from 0\u2013100.'

export function ScoreTooltip({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-gray-400 hover:text-gray-600 transition cursor-help"
        aria-label="Scoring methodology"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3 bg-gray-900 text-gray-200 text-xs leading-relaxed rounded-lg shadow-xl border border-gray-700">
          {METHODOLOGY_TEXT}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-gray-900" />
        </div>
      )}
    </div>
  )
}
