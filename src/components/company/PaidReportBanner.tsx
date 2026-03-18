'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, ArrowRight } from 'lucide-react'

interface PaidReportBannerProps {
  submissionId: string | null
}

export default function PaidReportBanner({ submissionId }: PaidReportBannerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isPaid = searchParams.get('paid') === 'true'
  const sidParam = searchParams.get('sid')
  const effectiveId = sidParam || submissionId

  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!isPaid || !effectiveId) return

    // Fire-and-forget: trigger report generation in background
    fetch(`/api/report/${effectiveId}`).catch(() => {})

    // Countdown and redirect to dashboard
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          router.push('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaid, effectiveId, router])

  if (!isPaid || !effectiveId) return null

  return (
    <div className="rounded-xl p-5 border bg-emerald-50 border-emerald-200 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Payment Successful!</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Your Readiness Report is being generated. We&apos;ll notify you when it&apos;s ready.
            Redirecting to dashboard in {countdown}s...
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0168FE] text-white rounded-lg text-sm font-medium hover:bg-[#0050CC] transition"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
