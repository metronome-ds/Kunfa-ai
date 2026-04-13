'use client'

import { useState } from 'react'

interface ScoreResult {
  overall_score: number
  percentile: number
  summary: string
  investment_readiness: string
  dimensions: {
    team: { score: number; letter_grade: string; headline: string }
    market: { score: number; letter_grade: string; headline: string }
    product: { score: number; letter_grade: string; headline: string }
    traction?: { score: number; letter_grade: string; headline: string }
    financial: { score: number; letter_grade: string; headline: string }
    fundraise_readiness?: { score: number; letter_grade: string; headline: string }
  }
}

interface TeaserScoreProps {
  result: ScoreResult
  submissionId: string
  onUnlock: () => void
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-kunfa'
  if (score >= 60) return 'text-kunfa-yellow'
  if (score >= 40) return 'text-kunfa-orange'
  return 'text-kunfa-red'
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'bg-green-100 text-green-700'
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700'
  if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function getReadinessColor(readiness: string): string {
  switch (readiness) {
    case 'Ready': return 'bg-green-100 text-green-700'
    case 'Almost Ready': return 'bg-blue-100 text-blue-700'
    case 'Needs Work': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const dimensionLabels: Record<string, { name: string; icon: string }> = {
  team: { name: 'Team & Founders', icon: '👥' },
  market: { name: 'Market Opportunity & TAM', icon: '📈' },
  product: { name: 'Product/Tech Differentiation', icon: '💡' },
  traction: { name: 'Traction & Growth', icon: '📊' },
  financial: { name: 'Financial Health & Projections', icon: '💰' },
  fundraise_readiness: { name: 'Fundraise Readiness', icon: '🎯' },
}

const memoFeatures = [
  'Full analysis across all 6 dimensions',
  'Specific strengths & risk factors',
  'Sector benchmarks & comparisons',
  'Slide-by-slide deck improvements',
  'Financial model feedback',
  'Strategic next steps & roadmap',
]

export default function TeaserScore({ result, submissionId, onUnlock }: TeaserScoreProps) {
  const [unlocking, setUnlocking] = useState(false)

  const handleUnlockClick = async () => {
    setUnlocking(true)
    try {
      await onUnlock()
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="p-6 sm:p-8">
      {/* Overall Score */}
      <div className="text-center mb-8">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke="#007CF8" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(result.overall_score / 100) * 339.292} 339.292`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${getScoreColor(result.overall_score)}`}>
              {result.overall_score}
            </span>
            <span className="text-xs text-gray-400">/100</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-kunfa-navy mb-1">Your Kunfa Score</h3>
        <p className="text-sm text-kunfa-text-secondary">
          Top <span className="font-semibold text-kunfa">{result.percentile}%</span> of submissions
        </p>
        <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${getReadinessColor(result.investment_readiness)}`}>
          {result.investment_readiness}
        </span>
      </div>

      {/* Executive Summary */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <p className="text-sm text-kunfa-text-secondary leading-relaxed">{result.summary}</p>
      </div>

      {/* Unlock CTA — prominent section, BEFORE dimension cards */}
      <div className="rounded-2xl overflow-hidden border-2 border-kunfa-indigo mb-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-8 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-xl font-bold mb-2">
            Unlock Your Full Investment Readiness Report
          </h4>
          <p className="text-indigo-200 text-sm mb-6 max-w-md mx-auto">
            Detailed analysis, sector benchmarks, and actionable recommendations to strengthen your fundraise
          </p>
          <button
            onClick={handleUnlockClick}
            disabled={unlocking}
            className="bg-white text-indigo-700 font-bold px-10 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors text-base shadow-lg disabled:opacity-50"
          >
            {unlocking ? 'Redirecting to checkout...' : 'Get Full Report — $59'}
          </button>
          <p className="text-indigo-300 text-xs mt-3">One-time purchase &middot; Instant PDF download &middot; Secure checkout</p>
        </div>

        <div className="bg-indigo-50 px-6 py-5">
          <p className="text-xs font-semibold text-indigo-900 mb-3 uppercase tracking-wide">What you get:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {memoFeatures.map((feature) => (
              <div key={feature} className="flex items-start gap-2">
                <svg className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-indigo-800">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension Cards — after CTA */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {(Object.entries(result.dimensions) as [string, typeof result.dimensions.team][])
          .filter(([, dim]) => dim && typeof dim === 'object')
          .map(([key, dim]) => {
          const label = dimensionLabels[key]
          if (!label) return null
          return (
            <div key={key} className="border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{label.icon}</span>
                  <h4 className="text-sm font-semibold text-kunfa-navy">{label.name}</h4>
                </div>
                <span className={`text-lg font-bold px-2 py-0.5 rounded-lg ${getGradeColor(dim.letter_grade)}`}>
                  {dim.letter_grade}
                </span>
              </div>
              <p className="text-xs text-kunfa-text-secondary mb-3">{dim.headline}</p>
              {/* Blurred/Locked section — clickable to trigger checkout */}
              <button
                onClick={handleUnlockClick}
                className="relative w-full text-left cursor-pointer group"
              >
                <div className="blur-sm select-none pointer-events-none">
                  <p className="text-xs text-gray-400">
                    Detailed analysis of strengths, risks, and specific recommendations
                    for improvement based on sector benchmarks and comparable startups...
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-sm group-hover:bg-indigo-50 group-hover:shadow-md transition-all">
                    <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-500 group-hover:text-indigo-600">Locked — Click to unlock</span>
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Powered by badge */}
      <div className="text-center">
        <span className="text-xs text-gray-400 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Scored by Kunfa AI
        </span>
      </div>
    </div>
  )
}
