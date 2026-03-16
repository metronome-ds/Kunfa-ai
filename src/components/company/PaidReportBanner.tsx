'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileText, Check, Loader2, ExternalLink } from 'lucide-react'

interface PaidReportBannerProps {
  submissionId: string | null
}

export default function PaidReportBanner({ submissionId }: PaidReportBannerProps) {
  const searchParams = useSearchParams()
  const isPaid = searchParams.get('paid') === 'true'
  const sidParam = searchParams.get('sid')
  const effectiveId = sidParam || submissionId

  const [status, setStatus] = useState<'generating' | 'ready' | 'error' | 'hidden'>('hidden')
  const [reportUrl, setReportUrl] = useState<string | null>(null)

  const checkReport = useCallback(async () => {
    if (!effectiveId) return

    try {
      const res = await fetch(`/api/report/${effectiveId}`, { method: 'HEAD' })
      if (res.ok) {
        setReportUrl(`/api/report/${effectiveId}`)
        setStatus('ready')
        return true
      }
      return false
    } catch {
      return false
    }
  }, [effectiveId])

  useEffect(() => {
    if (!isPaid || !effectiveId) return

    setStatus('generating')

    // Start generating the report
    const generate = async () => {
      try {
        // Trigger report generation
        const res = await fetch(`/api/report/${effectiveId}`)
        if (res.ok) {
          setReportUrl(`/api/report/${effectiveId}`)
          setStatus('ready')
        } else {
          // Poll for readiness
          let attempts = 0
          const poll = setInterval(async () => {
            attempts++
            const ready = await checkReport()
            if (ready || attempts > 30) {
              clearInterval(poll)
              if (!ready) setStatus('error')
            }
          }, 5000)
        }
      } catch {
        setStatus('error')
      }
    }

    generate()
  }, [isPaid, effectiveId, checkReport])

  if (status === 'hidden') return null

  return (
    <div className={`rounded-xl p-5 border shadow-sm ${
      status === 'ready'
        ? 'bg-emerald-50 border-emerald-200'
        : status === 'error'
          ? 'bg-red-50 border-red-200'
          : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center gap-4">
        {status === 'generating' && (
          <>
            <div className="w-10 h-10 rounded-full bg-[#0168FE]/10 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-[#0168FE] animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Generating your Readiness Report...</p>
              <p className="text-xs text-gray-500 mt-0.5">This usually takes 1-2 minutes. Please don&apos;t close this page.</p>
            </div>
          </>
        )}

        {status === 'ready' && (
          <>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Report Ready!</p>
              <p className="text-xs text-gray-500 mt-0.5">Your Kunfa Readiness Report has been generated.</p>
            </div>
            <a
              href={reportUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0168FE] text-white rounded-lg text-sm font-medium hover:bg-[#0050CC] transition"
            >
              <FileText className="w-4 h-4" />
              View Report
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Report generation is still in progress</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Check back in a few minutes. You&apos;ll also receive a notification when it&apos;s ready.
              </p>
            </div>
            <button
              onClick={() => { setStatus('generating'); checkReport() }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  )
}
