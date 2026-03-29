'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, getCurrentUser } from '@/lib/supabase'
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
  const router = useRouter()

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [result, setResult] = useState<{ approved?: boolean; pending?: boolean; slug?: string } | null>(null)
  const [error, setError] = useState('')

  // Signup form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)

  useEffect(() => {
    async function init() {
      // Fetch company info
      const res = await fetch(`/api/claim/info?token=${token}`)
      const data: CompanyInfo = await res.json()
      setCompanyInfo(data)

      if (data.valid && data.claim_invited_email) {
        setEmail(data.claim_invited_email)
      }

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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setSignupLoading(true)
    setSignupError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/claim/${token}`,
      },
    })

    if (error) {
      setSignupError(error.message)
      setSignupLoading(false)
      return
    }

    if (data.user && data.session) {
      // Immediate session — create profile and claim
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        email,
        full_name: fullName || null,
        role: 'startup',
        onboarding_completed: true,
      })

      // Auto-join pending invites
      await supabase
        .from('team_members')
        .update({ member_user_id: data.user.id, status: 'accepted', updated_at: new Date().toISOString() })
        .eq('invited_email', email)
        .eq('status', 'pending')

      setUser({ id: data.user.id, email: data.user.email })

      // Now claim
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const claimData = await res.json()

      if (claimData.approved) {
        window.location.href = '/dashboard?claimed=true'
      } else if (claimData.pending) {
        window.location.href = '/dashboard?claim_pending=true'
      }
      return
    }

    // No immediate session — confirmation email sent
    setConfirmationSent(true)
    setSignupLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0168FE]" />
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
          <Link href="/" className="text-[#0168FE] hover:underline text-sm font-medium">
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
            <Link href="/dashboard" className="text-[#0168FE] hover:underline text-sm font-medium">
              Go to Dashboard
            </Link>
          </div>
        </div>
      )
    }
  }

  // Confirmation sent state
  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#0168FE]/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#0168FE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600">
            We sent a confirmation link to <strong className="text-gray-900">{email}</strong>. Click the link to verify your account and claim <strong>{companyInfo.company_name}</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <KunfaLogo height={32} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Create your {companyInfo.company_name} profile on Kunfa
          </h1>
          <p className="text-gray-500 mt-2">
            Upload your pitch deck, get an AI-powered investment readiness score, and connect with investors.
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
              className="w-full py-3 bg-[#0168FE] text-white rounded-lg font-semibold hover:bg-[#0050CC] transition disabled:opacity-50"
            >
              {claiming ? 'Claiming...' : 'Claim This Company'}
            </button>
          </div>
        ) : (
          // Not logged in — show signup form
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <p className="text-sm text-gray-600 mb-4">
              Create an account to claim <strong>{companyInfo.company_name}</strong>
            </p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={!!companyInfo.claim_invited_email}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE] ${companyInfo.claim_invited_email ? 'bg-gray-50' : 'bg-white'}`}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
                  placeholder="Min 6 characters"
                />
              </div>

              {signupError && (
                <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{signupError}</div>
              )}

              <button
                type="submit"
                disabled={signupLoading}
                className="w-full py-3 bg-[#0168FE] text-white rounded-lg font-semibold hover:bg-[#0050CC] transition disabled:opacity-50"
              >
                {signupLoading ? 'Creating account...' : 'Sign Up & Claim'}
              </button>
            </form>

            <p className="text-center text-gray-600 text-sm mt-4">
              Already have an account?{' '}
              <Link href={`/login?next=/claim/${token}`} className="text-[#0168FE] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
