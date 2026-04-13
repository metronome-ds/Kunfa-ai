'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase'
import Link from 'next/link'
import KunfaLogo from '@/components/common/KunfaLogo'

interface CompanyInfo {
  valid: boolean
  company_name?: string
  one_liner?: string
  overall_score?: number | null
  industry?: string | null
  stage?: string | null
  claim_invited_email?: string | null
  claim_status?: string
}

function getScoreColor(score: number | null | undefined) {
  if (!score) return 'text-gray-500 bg-gray-100 border-gray-200'
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200'
  if (score >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>()

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [result, setResult] = useState<{ approved?: boolean; pending?: boolean; slug?: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      // Fetch company info
      const res = await fetch(`/api/claim/info?token=${token}`)
      const data: CompanyInfo = await res.json()
      setCompanyInfo(data)

      // Check if user is logged in
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser({ id: currentUser.id, email: currentUser.email })
      }

      setLoading(false)
    }
    init()
  }, [token])

  async function handleClaim() {
    setClaiming(true)
    setError('')
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to claim company')
        setClaiming(false)
        return
      }

      setResult(data)

      if (data.approved) {
        setTimeout(() => {
          window.location.href = '/dashboard?claimed=true'
        }, 1500)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setClaiming(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" />
      </div>
    )
  }

  if (!companyInfo?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <KunfaLogo height={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Claim Link</h1>
          <p className="text-gray-600 mb-6">
            This claim link is invalid or the company has already been claimed.
          </p>
          <Link href="/" className="text-[#007CF8] hover:underline text-sm font-medium">
            Go to Kunfa
          </Link>
        </div>
      </div>
    )
  }

  // Show result state
  if (result) {
    if (result.approved) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Claimed!</h2>
            <p className="text-gray-600 mb-4">
              You now own the <strong>{companyInfo.company_name}</strong> profile. Redirecting to your dashboard...
            </p>
          </div>
        </div>
      )
    }

    if (result.pending) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Claim Submitted for Review</h2>
            <p className="text-gray-600 mb-6">
              Your email domain doesn&apos;t match the company website, so your claim has been submitted for admin review. You&apos;ll receive an email once it&apos;s been reviewed.
            </p>
            <Link href="/dashboard" className="text-[#007CF8] hover:underline text-sm font-medium">
              Go to Dashboard
            </Link>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <KunfaLogo height={32} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Claim {companyInfo.company_name} on Kunfa
          </h1>
          <p className="text-gray-500 mt-2">
            Take ownership of your company profile, update your information, and connect with investors.
          </p>
        </div>

        {/* Company card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
          <div className="flex items-start gap-4">
            {companyInfo.overall_score && (
              <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${getScoreColor(companyInfo.overall_score)}`}>
                <span className="text-xl font-bold">{companyInfo.overall_score}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">{companyInfo.company_name}</h2>
              {companyInfo.one_liner && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{companyInfo.one_liner}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {companyInfo.industry && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                    {companyInfo.industry}
                  </span>
                )}
                {companyInfo.stage && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                    {companyInfo.stage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {user ? (
          // Logged in — show claim button
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <p className="text-sm text-gray-600 mb-4">
              Logged in as <strong className="text-gray-900">{user.email}</strong>
            </p>

            {error && (
              <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</div>
            )}

            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-3 bg-[#007CF8] text-white rounded-lg font-semibold hover:bg-[#0066D6] transition disabled:opacity-50"
            >
              {claiming ? 'Claiming...' : 'Claim This Company'}
            </button>
          </div>
        ) : (
          // Not logged in — redirect to signup with claim token
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <p className="text-sm text-gray-600 mb-4">
              Create an account to claim <strong>{companyInfo.company_name}</strong>. We&apos;ll verify your email with a 6-digit code.
            </p>

            <Link
              href={`/signup?claim=${token}`}
              className="w-full block text-center py-3 bg-[#007CF8] text-white rounded-lg font-semibold hover:bg-[#0066D6] transition"
            >
              Sign Up & Claim
            </Link>

            <p className="text-center text-gray-600 text-sm mt-4">
              Already have an account?{' '}
              <Link
                href={`/login?claim=${token}`}
                className="text-[#007CF8] font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
