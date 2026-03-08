'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface ReportBannerProps {
  submissionId: string | null
}

export function ReportBanner({ submissionId }: ReportBannerProps) {
  const [state, setState] = useState<'loading' | 'paid' | 'unpaid' | 'hidden'>('loading')
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)

  useEffect(() => {
    if (!submissionId) {
      setState('hidden')
      return
    }

    async function check() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data } = await supabase
        .from('submissions')
        .select('paid, report_url')
        .eq('id', submissionId)
        .single()

      if (!data) {
        setState('hidden')
        return
      }

      if (data.paid && data.report_url) {
        setState('paid')
        setReportUrl(data.report_url)
      } else {
        setState('unpaid')
      }
    }

    check()
  }, [submissionId])

  const handleCheckout = async () => {
    setUnlocking(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })
      const data = await response.json()
      if (data.url) window.location.href = data.url
    } catch {
      // ignore
    } finally {
      setUnlocking(false)
    }
  }

  if (state === 'loading' || state === 'hidden') return null

  if (state === 'paid') {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Your Kunfa Readiness Report</h3>
          <p className="text-sm text-gray-600 mt-1">Your full AI-powered investment analysis is ready.</p>
        </div>
        <a
          href={`/report/${submissionId}`}
          className="bg-[#10B981] text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-[#059669] transition flex-shrink-0"
        >
          View Your Readiness Report
        </a>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Unlock Your Full Kunfa Readiness Report</h3>
        <p className="text-sm text-gray-600 mt-1">Detailed analysis, sector benchmarks, and actionable recommendations — $59</p>
      </div>
      <button
        onClick={handleCheckout}
        disabled={unlocking}
        className="bg-[#10B981] text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-[#059669] transition flex-shrink-0 disabled:opacity-50 shadow-md"
      >
        {unlocking ? 'Redirecting...' : 'Unlock Report — $59'}
      </button>
    </div>
  )
}
