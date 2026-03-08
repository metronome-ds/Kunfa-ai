'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ScoreTooltip } from '@/components/ui/ScoreTooltip'

interface ScoreResult {
  overall_score: number
  percentile: number
  summary: string
  investment_readiness: string
  dimensions: {
    team: { score: number; letter_grade: string; headline: string }
    market: { score: number; letter_grade: string; headline: string }
    product: { score: number; letter_grade: string; headline: string }
    financial: { score: number; letter_grade: string; headline: string }
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreRingColor(score: number) {
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#EAB308'
  return '#EF4444'
}

function getGradeColor(grade: string) {
  if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-700'
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700'
  if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

const dimensionLabels: Record<string, string> = {
  team: 'Team & Founders',
  market: 'Market Opportunity',
  product: 'Product & Tech',
  financial: 'Financial Health',
}

export default function ScoreResultsPage() {
  const params = useParams()
  const id = params.id as string
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  useEffect(() => {
    async function fetchScore() {
      try {
        const res = await fetch(`/api/score/${id}`)
        if (!res.ok) throw new Error('Failed to load score')
        const data = await res.json()
        setResult(data.teaser)
        setSlug(data.slug)
        setCompanyName(data.companyName)
      } catch {
        setError('Unable to load your score. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchScore()
  }, [id])

  const handleUnlock = async () => {
    setUnlocking(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id }),
      })
      const data = await response.json()
      if (data.url) window.location.href = data.url
    } catch {
      setError('Failed to initiate checkout')
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-gray-900 font-semibold text-lg">Kunfa.AI</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading your score...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/" className="text-[#10B981] font-semibold hover:underline">Return Home</Link>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            {/* Score Header */}
            <div className="text-center">
              {companyName && (
                <h1 className="text-2xl font-bold text-gray-900 mb-6">{companyName}</h1>
              )}

              {/* Large Score Circle */}
              <div className="relative w-40 h-40 mx-auto mb-4">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke={getScoreRingColor(result.overall_score)} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.overall_score / 100) * 339.292} 339.292`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-5xl font-bold ${getScoreColor(result.overall_score)}`}>
                    {result.overall_score}
                  </span>
                  <span className="text-sm text-gray-400">/100</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 mb-1">
                <h2 className="text-xl font-bold text-gray-900">Your Kunfa Score</h2>
                <ScoreTooltip />
              </div>
              <p className="text-sm text-gray-500">
                Top <span className="font-semibold text-[#10B981]">{result.percentile}%</span> of submissions
              </p>
            </div>

            {/* AI Summary */}
            {result.summary && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Summary</h3>
                <p className="text-gray-700 leading-relaxed">{result.summary}</p>
              </div>
            )}

            {/* Category Scores */}
            <div className="grid sm:grid-cols-2 gap-4">
              {(Object.entries(result.dimensions) as [string, { score: number; letter_grade: string; headline: string }][]).map(([key, dim]) => (
                <div key={key} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">{dimensionLabels[key] || key}</h4>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg ${getGradeColor(dim.letter_grade)}`}>
                      {dim.letter_grade}
                    </span>
                  </div>
                  {dim.headline && (
                    <p className="text-xs text-gray-500">{dim.headline}</p>
                  )}
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col items-center gap-3 pt-4">
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full max-w-md bg-[#10B981] text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-[#059669] transition disabled:opacity-50 shadow-lg"
              >
                {unlocking ? 'Redirecting to checkout...' : 'Unlock Your Full Kunfa Readiness Report — $59'}
              </button>

              {slug && (
                <Link
                  href={`/company/${slug}`}
                  className="w-full max-w-md text-center border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-base hover:border-[#10B981] hover:text-[#10B981] transition"
                >
                  View My Company Profile &rarr;
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
