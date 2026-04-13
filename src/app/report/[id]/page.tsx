'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import KunfaLogo from '@/components/common/KunfaLogo'
import { OptionalSidebarLayout } from '@/components/common/OptionalSidebarLayout'

type Status = 'loading' | 'verifying' | 'paid' | 'unpaid' | 'generating' | 'error'

export default function ReportPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<Status>('loading')
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [downloading, setDownloading] = useState(false)

  const verifyPayment = useCallback(async () => {
    if (!sessionId) return

    setStatus('verifying')
    try {
      const response = await fetch('/api/stripe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, submissionId: id }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          // Payment not yet processed — retry after delay
          await new Promise(resolve => setTimeout(resolve, 3000))
          const retry = await fetch('/api/stripe/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, submissionId: id }),
          })
          if (retry.ok) {
            // Reload submission state
            await loadSubmission()
            return
          }
        }
        throw new Error(data.error || 'Payment verification failed')
      }

      // Payment verified — reload submission to get report_url
      await loadSubmission()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }, [sessionId, id])

  const loadSubmission = useCallback(async () => {
    try {
      const res = await fetch(`/api/score/${id}`)
      if (!res.ok) {
        setStatus('error')
        setErrorMessage('Submission not found')
        return
      }

      // Check payment status via a separate check
      const checkRes = await fetch(`/api/report/${id}`, { method: 'HEAD' }).catch(() => null)

      if (checkRes?.status === 403) {
        // Not paid
        setStatus('unpaid')
        return
      }

      if (checkRes?.ok || checkRes?.status === 302) {
        // Already has a report — try to get the URL
        // The API returns the PDF or redirects; we'll just use the API URL for iframe
        setReportUrl(`/api/report/${id}`)
        setStatus('paid')
        return
      }

      // If we get here and had a session_id, payment was verified — report needs generating
      if (sessionId) {
        setReportUrl(`/api/report/${id}`)
        setStatus('paid')
        return
      }

      setStatus('unpaid')
    } catch {
      setStatus('error')
      setErrorMessage('Failed to load report status')
    }
  }, [id, sessionId])

  useEffect(() => {
    if (sessionId) {
      verifyPayment()
    } else {
      loadSubmission()
    }
  }, [sessionId, verifyPayment, loadSubmission])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      window.open(`/api/report/${id}`, '_blank')
    } catch {
      setErrorMessage('Failed to download report')
    } finally {
      setTimeout(() => setDownloading(false), 2000)
    }
  }

  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id }),
      })
      const data = await response.json()
      if (data.url) window.location.href = data.url
    } catch {
      setErrorMessage('Failed to initiate checkout')
    }
  }

  const fallbackNav = (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/">
          <KunfaLogo height={28} />
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition">
          Dashboard
        </Link>
      </div>
    </nav>
  );

  return (
    <OptionalSidebarLayout fallbackNav={fallbackNav}>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Loading */}
        {(status === 'loading' || status === 'verifying') && (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-[#007CF8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">
              {status === 'verifying' ? 'Verifying payment...' : 'Loading report...'}
            </p>
          </div>
        )}

        {/* Paid — Show Report */}
        {status === 'paid' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kunfa Readiness Report</h1>
                <p className="text-sm text-gray-500 mt-1">Your AI-powered investment memorandum</p>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#007CF8] text-white rounded-lg font-semibold text-sm hover:bg-[#0066D6] transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {downloading ? 'Opening...' : 'Download PDF'}
              </button>
            </div>

            {/* PDF Viewer */}
            {reportUrl && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <iframe
                  src={reportUrl}
                  className="w-full border-0"
                  style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}
                  title="Kunfa Readiness Report"
                />
              </div>
            )}
          </div>
        )}

        {/* Generating */}
        {status === 'generating' && (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Generating Your Report...</h2>
            <p className="text-gray-500 text-sm">Building your investment memorandum. This may take a moment.</p>
          </div>
        )}

        {/* Not Paid — Upsell */}
        {status === 'unpaid' && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#007CF8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Unlock Your Full Readiness Report</h1>
            <p className="text-gray-600 mb-8">
              Get a comprehensive AI-powered investment readiness report with detailed scoring across 6 dimensions, sector benchmarks, and actionable recommendations.
            </p>
            <button
              onClick={handleCheckout}
              className="bg-[#007CF8] text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-[#0066D6] transition shadow-lg"
            >
              Unlock Report — $59
            </button>
            <div className="mt-8 grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
              {[
                'Executive Summary',
                'Team & Founder Analysis',
                'Market Deep-Dive',
                'Financial Health Review',
                'Sector Benchmarks',
                'Strategic Recommendations',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#007CF8] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-gray-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-6">{errorMessage}</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setStatus('loading')
                  setErrorMessage('')
                  if (sessionId) verifyPayment()
                  else loadSubmission()
                }}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-800 transition"
              >
                Retry
              </button>
              <Link href="/dashboard" className="text-[#007CF8] font-semibold text-sm hover:underline">
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </OptionalSidebarLayout>
  )
}
