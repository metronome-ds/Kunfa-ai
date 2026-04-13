'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

interface ReportBannerProps {
  submissionId: string | null
}

export function ReportBanner({ submissionId }: ReportBannerProps) {
  const searchParams = useSearchParams()
  const justPaid = searchParams.get('paid') === 'true'

  const [state, setState] = useState<'loading' | 'paid' | 'unpaid' | 'hidden' | 'generating' | 'ready' | 'timeout'>('loading')
  const [unlocking, setUnlocking] = useState(false)
  const [progress, setProgress] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

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
        setState(justPaid ? 'ready' : 'paid')
      } else if (data.paid && !data.report_url) {
        // Paid but report not generated yet — start generating + polling
        if (justPaid) {
          setState('generating')
          startGenerationPolling()
          triggerReportGeneration()
        } else {
          setState('paid')
        }
      } else {
        setState('unpaid')
      }
    }

    check()

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, justPaid])

  // Trigger report generation by calling the report API
  async function triggerReportGeneration() {
    try {
      await fetch(`/api/report/${submissionId}`, { method: 'HEAD' })
    } catch {
      // ignore — the poll will catch when it's ready
    }
  }

  function startGenerationPolling() {
    startTimeRef.current = Date.now()
    setProgress(5)

    pollRef.current = setInterval(async () => {
      const elapsed = Date.now() - startTimeRef.current
      // Simulate progress: fast at start, slow toward end
      const simulated = Math.min(90, 5 + (elapsed / 1000) * 1.5)
      setProgress(simulated)

      // Check if report is ready
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data } = await supabase
        .from('submissions')
        .select('report_url')
        .eq('id', submissionId!)
        .single()

      if (data?.report_url) {
        setProgress(100)
        if (pollRef.current) clearInterval(pollRef.current)
        setTimeout(() => setState('ready'), 500)
        return
      }

      // Timeout after 60 seconds
      if (elapsed > 60000) {
        if (pollRef.current) clearInterval(pollRef.current)
        setState('timeout')
      }
    }, 3000)
  }

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

  // Generating state — animated progress bar
  if (state === 'generating') {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 border-3 border-[#007CF8] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Generating your Kunfa Readiness Report...</h3>
            <p className="text-sm text-gray-500 mt-0.5">Building your AI-powered investment readiness report</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-[#007CF8] h-2.5 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">This usually takes 30–60 seconds</p>
      </div>
    )
  }

  // Timeout state
  if (state === 'timeout') {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
        <h3 className="text-lg font-bold text-gray-900">Report is still generating</h3>
        <p className="text-sm text-gray-600 mt-1">
          Your report is taking longer than expected. We&apos;ll notify you when it&apos;s ready.
        </p>
        <p className="text-xs text-gray-400 mt-2">You can safely leave this page — check back shortly or look for a notification.</p>
      </div>
    )
  }

  // Ready state — just generated
  if (state === 'ready') {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Your report is ready!</h3>
            <p className="text-sm text-gray-600 mt-0.5">Your full AI-powered investment analysis has been generated.</p>
          </div>
        </div>
        <a
          href={`/report/${submissionId}`}
          className="bg-[#007CF8] text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-[#0066D6] transition flex-shrink-0"
        >
          View Report
        </a>
      </div>
    )
  }

  // Paid state (existing report)
  if (state === 'paid') {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Your Kunfa Readiness Report</h3>
          <p className="text-sm text-gray-600 mt-1">Your full AI-powered investment analysis is ready.</p>
        </div>
        <a
          href={`/report/${submissionId}`}
          className="bg-[#007CF8] text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-[#0066D6] transition flex-shrink-0"
        >
          View Your Readiness Report
        </a>
      </div>
    )
  }

  // Unpaid state
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Unlock Your Full Kunfa Readiness Report</h3>
        <p className="text-sm text-gray-600 mt-1">Detailed analysis, sector benchmarks, and actionable recommendations — $59</p>
      </div>
      <button
        onClick={handleCheckout}
        disabled={unlocking}
        className="bg-[#007CF8] text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-[#0066D6] transition flex-shrink-0 disabled:opacity-50 shadow-md"
      >
        {unlocking ? 'Redirecting...' : 'Unlock Report — $59'}
      </button>
    </div>
  )
}
