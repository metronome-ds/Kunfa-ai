'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Building2, TrendingUp, Mail, RefreshCw } from 'lucide-react'
import KunfaLogo from '@/components/common/KunfaLogo'

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0168FE]" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}

function SignupContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showRoleSelection, setShowRoleSelection] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [tosAgreed, setTosAgreed] = useState(false)
  const [inviteId, setInviteId] = useState<string | null>(null)
  const [inviteEmailLocked, setInviteEmailLocked] = useState(false)
  const [claimToken, setClaimToken] = useState<string | null>(null)
  const [claimCompanyName, setClaimCompanyName] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'startup' | 'investor' | null>(null)

  // Email confirmation resend state
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    // Handle claim link: pre-fill email from claim invite
    const claim = searchParams.get('claim')
    if (claim) {
      setClaimToken(claim)
      fetch(`/api/claim/info?token=${claim}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.valid) {
            setClaimCompanyName(data.company_name)
            if (data.claim_invited_email) {
              setEmail(data.claim_invited_email)
              setInviteEmailLocked(true)
            }
          }
        })
        .catch(() => {})
    }

    // Handle invite link: pre-fill email from team invite
    const invite = searchParams.get('invite')
    if (invite) {
      setInviteId(invite)
      fetch(`/api/auth/invite?id=${invite}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.email) {
            setEmail(data.email)
            setInviteEmailLocked(true)
          }
        })
        .catch(() => {})
    }

    if (searchParams.get('step') === 'role') {
      const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          setShowRoleSelection(true)
        }
      }
      checkUser()
    }
  }, [searchParams])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResendConfirmation = useCallback(async () => {
    if (resendCooldown > 0 || resending || !email) return
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: claimToken
            ? `${window.location.origin}/auth/confirm?next=/claim/${claimToken}`
            : `${window.location.origin}/auth/confirm`,
        },
      })
      if (error) throw error
      setResendCooldown(60)
    } catch {
      setError('Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }, [email, claimToken, resendCooldown, resending])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const signupRole = claimToken ? 'startup' : inviteId ? 'investor' : selectedRole

    const redirectUrl = claimToken
      ? `${window.location.origin}/auth/confirm?next=/claim/${claimToken}`
      : `${window.location.origin}/auth/confirm`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role: signupRole,
          ...(inviteId ? { invite: inviteId } : {}),
        },
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      if (data.session) {
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          email,
          ...(signupRole ? { role: signupRole } : {}),
        })

        // Auto-join: accept all pending invites for this email
        await supabase
          .from('team_members')
          .update({ member_user_id: data.user.id, status: 'accepted', updated_at: new Date().toISOString() })
          .eq('invited_email', email)
          .eq('status', 'pending')

        // If signing up via claim link, process claim and skip role selection
        if (claimToken) {
          try {
            const res = await fetch('/api/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: claimToken }),
            })
            const claimData = await res.json()

            if (claimData.approved) {
              window.location.href = '/dashboard?claimed=true'
            } else {
              window.location.href = '/dashboard?claim_pending=true'
            }
          } catch {
            window.location.href = '/dashboard'
          }
          return
        }

        // If signing up via invite link, skip role selection and go to dashboard
        if (inviteId) {
          fetch('/api/auth/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'investor' }),
          }).catch(() => {})
          window.location.href = '/dashboard'
          return
        }

        // Role already selected in form — redirect directly
        if (signupRole) {
          fetch('/api/auth/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: signupRole }),
          }).catch(() => {})
          window.location.href = signupRole === 'investor' ? '/onboarding' : '/dashboard'
          return
        }

        // Fallback: show role selection screen
        setUserId(data.user.id)
        setShowRoleSelection(true)
      } else {
        setSuccess(true)
      }
    }

    setLoading(false)
  }

  async function handleRoleSelect(role: 'startup' | 'investor') {
    if (!userId) return
    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('user_id', userId)

    if (error) {
      setError('Failed to set role. Please try again.')
      setLoading(false)
      return
    }

    // Send welcome email (fire and forget)
    fetch('/api/auth/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }).catch(() => {})

    if (role === 'startup') {
      window.location.href = '/'
    } else {
      window.location.href = '/onboarding'
    }
  }

  if (showRoleSelection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="mb-6">
              <KunfaLogo height={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">How will you use Kunfa?</h1>
            <p className="text-gray-600 mt-2">Choose your role to get started</p>
          </div>

          {error && (
            <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-6">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleRoleSelect('startup')}
              disabled={loading}
              className="group bg-white rounded-xl p-8 border-2 border-gray-200 hover:border-[#0168FE] transition-all text-left disabled:opacity-50 shadow-sm"
            >
              <div className="w-14 h-14 rounded-xl bg-[#0168FE]/10 flex items-center justify-center mb-4 group-hover:bg-[#0168FE]/20 transition">
                <Building2 className="w-7 h-7 text-[#0168FE]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">I&apos;m a Startup</h3>
              <p className="text-sm text-gray-600">Get your pitch scored by AI and connect with investors</p>
            </button>

            <button
              onClick={() => handleRoleSelect('investor')}
              disabled={loading}
              className="group bg-white rounded-xl p-8 border-2 border-gray-200 hover:border-[#0168FE] transition-all text-left disabled:opacity-50 shadow-sm"
            >
              <div className="w-14 h-14 rounded-xl bg-[#0168FE]/10 flex items-center justify-center mb-4 group-hover:bg-[#0168FE]/20 transition">
                <TrendingUp className="w-7 h-7 text-[#0168FE]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">I&apos;m an Investor</h3>
              <p className="text-sm text-gray-600">Discover deals, manage pipeline, and track portfolio</p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <KunfaLogo height={32} />
            </Link>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg text-center">
            <div className="w-16 h-16 rounded-full bg-[#0168FE]/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-[#0168FE]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-1">
              We&apos;ve sent a confirmation link to
            </p>
            <p className="font-semibold text-gray-900 mb-6">{email}</p>
            <p className="text-sm text-gray-500 mb-6">
              Click the link in your email to activate your account. It may take a minute to arrive.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-500 mb-3">
                Didn&apos;t receive it? Check your spam folder or resend below.
              </p>
              <button
                onClick={handleResendConfirmation}
                disabled={resendCooldown > 0 || resending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0168FE] bg-white border border-[#0168FE]/20 rounded-lg hover:bg-[#0168FE]/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                {resending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend confirmation email'
                }
              </button>
              {error && (
                <p className="text-xs text-red-600 mt-2">{error}</p>
              )}
            </div>

            <Link href="/login" className="text-[#0168FE] hover:underline text-sm font-medium">
              Back to sign in
            </Link>
          </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-2">{claimCompanyName ? `Sign up to claim ${claimCompanyName}` : inviteId ? 'Sign up to accept your team invitation' : 'Get your startup scored by AI'}</p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
          <form onSubmit={handleSignup} className="space-y-4">
            {!claimToken && !inviteId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('startup')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition ${
                      selectedRole === 'startup'
                        ? 'border-[#0168FE] bg-[#0168FE]/5 text-[#0168FE]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                    Startup
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('investor')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition ${
                      selectedRole === 'investor'
                        ? 'border-[#0168FE] bg-[#0168FE]/5 text-[#0168FE]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    Investor
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                readOnly={inviteEmailLocked}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE] ${inviteEmailLocked ? 'bg-gray-50' : 'bg-white'}`}
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
                placeholder="Min 6 characters" />
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={tosAgreed}
                onChange={(e) => setTosAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0168FE] focus:ring-[#0168FE]"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-[#0168FE] hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-[#0168FE] hover:underline">Privacy Policy</Link>
              </span>
            </label>

            {error && (
              <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
            )}

            <button type="submit" disabled={loading || !tosAgreed || (!claimToken && !inviteId && !selectedRole)}
              className="w-full py-3 bg-[#0168FE] text-white rounded-lg font-semibold hover:bg-[#0050CC] transition disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0168FE] font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
