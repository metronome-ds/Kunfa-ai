'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Submission {
  id: string
  overall_score: number | null
  paid: boolean
  report_url: string | null
  full_analysis: Record<string, unknown> | null
  created_at: string
}

interface CompanyPage {
  slug: string
  company_name: string
  overall_score: number | null
  is_public: boolean
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [companyPage, setCompanyPage] = useState<CompanyPage | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('user_id', user.id)
        .single()

      setUserName(profile?.full_name || profile?.company_name || user.email?.split('@')[0] || '')

      // Load submission
      const { data: sub } = await supabase
        .from('submissions')
        .select('id, overall_score, paid, report_url, full_analysis, created_at')
        .eq('user_id', user.id)
        .single()

      if (sub) setSubmission(sub)

      // Load company page
      const { data: cp } = await supabase
        .from('company_pages')
        .select('slug, company_name, overall_score, is_public')
        .eq('user_id', user.id)
        .single()

      if (cp) setCompanyPage(cp)

      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const score = submission?.overall_score
  const analysis = submission?.full_analysis as Record<string, unknown> | null

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-gray-400 mt-1">Here&apos;s an overview of your Kunfa Score and company page.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Score */}
        <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Kunfa Score</p>
          {score != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-[#10B981]">{score}</span>
              <span className="text-gray-500 text-sm">/ 100</span>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No score yet</p>
          )}
        </div>

        {/* Report Status */}
        <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Full Report</p>
          {submission?.paid ? (
            <div>
              <span className="text-green-400 text-sm font-medium">Unlocked</span>
              {submission.report_url && (
                <a
                  href={submission.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-[#10B981] text-sm hover:underline"
                >
                  Download PDF
                </a>
              )}
            </div>
          ) : submission ? (
            <div>
              <span className="text-yellow-400 text-sm font-medium">Locked</span>
              <Link href={`/score/${submission.id}`} className="block mt-2 text-[#10B981] text-sm hover:underline">
                Unlock for $59
              </Link>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No submission yet</p>
          )}
        </div>

        {/* Company Page */}
        <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Company Page</p>
          {companyPage ? (
            <div>
              <span className="text-white font-medium">{companyPage.company_name}</span>
              <Link
                href={`/company/${companyPage.slug}`}
                className="block mt-2 text-[#10B981] text-sm hover:underline"
              >
                View public page
              </Link>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Created after scoring</p>
          )}
        </div>
      </div>

      {/* Score Breakdown */}
      {analysis && (analysis as any).dimensions && (
        <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
          <h2 className="text-white font-semibold text-lg mb-4">Score Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries((analysis as any).dimensions || {}).map(([key, dim]: [string, any]) => (
              <div key={key} className="text-center">
                <div className="text-2xl font-bold text-white">{dim?.score ?? '—'}</div>
                <div className="text-xs text-gray-400 capitalize mt-1">{key}</div>
                {dim?.letter_grade && (
                  <div className="text-xs text-[#10B981] font-medium mt-0.5">{dim.letter_grade}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {analysis && (analysis as any).summary && (
        <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
          <h2 className="text-white font-semibold text-lg mb-3">AI Summary</h2>
          <p className="text-gray-300 text-sm leading-relaxed">{(analysis as any).summary}</p>
        </div>
      )}

      {/* No Submission CTA */}
      {!submission && (
        <div className="bg-[#1E293B] rounded-xl p-8 border border-gray-700 text-center">
          <h2 className="text-white font-semibold text-xl mb-2">Get Your Kunfa Score</h2>
          <p className="text-gray-400 mb-4">Upload your pitch deck and financials to get an AI-powered score.</p>
          <Link
            href="/"
            className="inline-block bg-[#10B981] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#059669] transition"
          >
            Start Scoring
          </Link>
        </div>
      )}
    </div>
  )
}
