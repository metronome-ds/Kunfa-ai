'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface ScoreSummary {
  overall_score: number
  percentile: number
  investment_readiness: string
}

type Status = 'verifying' | 'ready' | 'generating' | 'error'

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-yellow-500'
  if (score >= 40) return 'text-orange-500'
  return 'text-red-500'
}

function getReadinessBadge(readiness: string): string {
  switch (readiness) {
    case 'Ready': return 'bg-emerald-100 text-emerald-700'
    case 'Almost Ready': return 'bg-blue-100 text-blue-700'
    case 'Needs Work': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export default function ReportPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<Status>('verifying')
  const [scoreSummary, setScoreSummary] = useState<ScoreSummary | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [downloading, setDownloading] = useState(false)

  const verifyPayment = useCallback(async () => {
    if (!sessionId) {
      // No session_id means direct access — try downloading directly (for test bypass)
      setStatus('ready')
      return
    }

    try {
      const response = await fetch('/api/stripe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, submissionId: id }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          // Payment not yet processed — retry after delay (webhook may be in-flight)
          await new Promise(resolve => setTimeout(resolve, 3000))
          const retry = await fetch('/api/stripe/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, submissionId: id }),
          })
          const retryData = await retry.json()
          if (retry.ok && retryData.verified) {
            setScoreSummary(retryData.scoreSummary)
            setStatus('ready')
            return
          }
        }
        throw new Error(data.error || 'Payment verification failed')
      }

      if (data.scoreSummary) {
        setScoreSummary(data.scoreSummary)
      }
      setStatus('ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }, [sessionId, id])

  useEffect(() => {
    verifyPayment()
  }, [verifyPayment])

  const handleDownload = async () => {
    setDownloading(true)
    setStatus('generating')
    try {
      // Open in new tab — the API route will return the PDF
      window.open(`/api/report/${id}`, '_blank')
      // After a brief pause, return to ready state
      await new Promise(resolve => setTimeout(resolve, 2000))
      setStatus('ready')
    } catch {
      setErrorMessage('Failed to download report. Please try again.')
      setStatus('error')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-kunfa-navy px-6 py-5 flex items-center justify-center gap-3">
          <div className="w-9 h-9 bg-kunfa-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Kunfa.AI</span>
        </div>

        <div className="p-8">
          {/* Verifying Payment */}
          {status === 'verifying' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-kunfa-green border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold text-kunfa-navy mb-2">Verifying Payment...</h2>
              <p className="text-kunfa-text-secondary text-sm">
                Confirming your payment with Stripe. This should only take a moment.
              </p>
            </div>
          )}

          {/* Generating PDF */}
          {status === 'generating' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold text-kunfa-navy mb-2">Generating Your Report...</h2>
              <p className="text-kunfa-text-secondary text-sm">
                Building your 15+ page investment memorandum. This may take a few seconds.
              </p>
            </div>
          )}

          {/* Ready — Success State */}
          {status === 'ready' && (
            <>
              {/* Success checkmark with animation */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 animate-[scale-in_0.3s_ease-out]">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-kunfa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-kunfa-navy mb-1">Payment Successful!</h2>
                <p className="text-kunfa-text-secondary text-sm">
                  Your Kunfa Investment Memorandum is ready.
                </p>
              </div>

              {/* Score Summary Card */}
              {scoreSummary && (
                <div className="bg-gradient-to-br from-slate-50 to-emerald-50 rounded-xl p-5 mb-6 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-kunfa-text-secondary uppercase tracking-wide mb-1">Your Kunfa Score</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-bold ${getScoreColor(scoreSummary.overall_score)}`}>
                          {scoreSummary.overall_score}
                        </span>
                        <span className="text-sm text-gray-400">/100</span>
                      </div>
                      <p className="text-xs text-kunfa-text-secondary mt-1">
                        Top <span className="font-semibold text-kunfa-green">{scoreSummary.percentile}%</span> of submissions
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getReadinessBadge(scoreSummary.investment_readiness)}`}>
                        {scoreSummary.investment_readiness}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-kunfa-green to-emerald-500 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-3 mb-4 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Your Investment Memorandum
              </button>

              <p className="text-center text-xs text-kunfa-text-secondary mb-8">
                PDF format &middot; 15+ pages &middot; Instant download
              </p>

              {/* What's Included */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-kunfa-navy mb-4">What&apos;s in your report:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Executive Summary',
                    'Team & Founder Analysis',
                    'Market Opportunity Deep-Dive',
                    'Product/Tech Assessment',
                    'Financial Health Review',
                    'Sector Benchmarks',
                    'Slide-by-Slide Deck Feedback',
                    'Strategic Recommendations',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-kunfa-green shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs text-kunfa-text-secondary">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-kunfa-navy mb-2">Verification Failed</h2>
              <p className="text-kunfa-text-secondary text-sm mb-2">{errorMessage}</p>
              <p className="text-kunfa-text-secondary text-xs mb-6">
                If your payment was processed, the report will be available shortly. Please refresh the page or contact support.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setStatus('verifying')
                    setErrorMessage('')
                    verifyPayment()
                  }}
                  className="bg-kunfa-navy text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                >
                  Retry
                </button>
                <a
                  href="mailto:hello@kunfa.ai"
                  className="text-kunfa-green font-semibold hover:underline text-sm"
                >
                  Contact Support
                </a>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
            <a href="/" className="text-sm text-kunfa-text-secondary hover:text-kunfa-green transition-colors">
              &larr; Return to Kunfa.AI
            </a>
            <span className="text-xs text-gray-300 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Powered by Kunfa AI
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
