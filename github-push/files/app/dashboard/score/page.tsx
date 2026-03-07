'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ScorePage() {
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState<{
    id: string
    overall_score: number | null
    paid: boolean
    report_url: string | null
    full_analysis: Record<string, unknown> | null
  } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) setSubmission(data)
      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="h-96 bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="max-w-3xl text-center py-16">
        <h1 className="text-2xl font-bold text-white mb-3">No Score Yet</h1>
        <p className="text-gray-400 mb-6">You haven&apos;t submitted your startup for scoring yet.</p>
        <Link href="/" className="inline-block bg-[#10B981] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#059669] transition">
          Get Your Score
        </Link>
      </div>
    )
  }

  const analysis = submission.full_analysis as Record<string, unknown> | null
  const dimensions = (analysis as any)?.dimensions || {}

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Your Kunfa Score</h1>
        {submission.paid && submission.report_url ? (
          <a
            href={submission.report_url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#10B981] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#059669] transition"
          >
            Download Report
          </a>
        ) : null}
      </div>

      {/* Score Header */}
      <div className="bg-[#1E293B] rounded-xl p-8 border border-gray-700 text-center">
        <p className="text-gray-400 text-sm mb-2">Overall Score</p>
        <div className="text-6xl font-bold text-[#10B981]">{submission.overall_score ?? '—'}</div>
        <p className="text-gray-500 text-sm mt-2">out of 100</p>
        {!submission.paid && (
          <Link
            href={`/score/${submission.id}`}
            className="inline-block mt-4 bg-[#10B981] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#059669] transition"
          >
            Unlock Full Report — $59
          </Link>
        )}
      </div>

      {/* Dimension Scores */}
      {Object.keys(dimensions).length > 0 && (
        <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
          <h2 className="text-white font-semibold text-lg mb-4">Dimension Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(dimensions).map(([key, dim]: [string, any]) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-300 text-sm capitalize">{key}</span>
                  <div className="flex items-center gap-2">
                    {dim?.letter_grade && (
                      <span className="text-xs font-medium text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded">
                        {dim.letter_grade}
                      </span>
                    )}
                    <span className="text-white font-semibold text-sm">{dim?.score ?? 0}/100</span>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-[#10B981] h-2 rounded-full transition-all"
                    style={{ width: `${dim?.score ?? 0}%` }}
                  />
                </div>
                {dim?.headline && (
                  <p className="text-xs text-gray-500 mt-1">{dim.headline}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {(analysis as any)?.summary && (
        <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
          <h2 className="text-white font-semibold text-lg mb-3">Summary</h2>
          <p className="text-gray-300 text-sm leading-relaxed">{(analysis as any).summary}</p>
        </div>
      )}

      {/* Investment Readiness */}
      {(analysis as any)?.investment_readiness && (
        <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
          <h2 className="text-white font-semibold text-lg mb-3">Investment Readiness</h2>
          <p className="text-gray-300 text-sm leading-relaxed">{(analysis as any).investment_readiness}</p>
        </div>
      )}
    </div>
  )
}
