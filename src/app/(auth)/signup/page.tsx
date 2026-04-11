'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Building2, TrendingUp, RefreshCw, Users } from 'lucide-react'
import KunfaLogo from '@/components/common/KunfaLogo'

type SignupStep = 'form' | 'otp'

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

/**
 * 6-digit OTP input: individual boxes with auto-advance, backspace nav, and paste support.
 * Calls onComplete(code) when all 6 digits are filled.
 */
function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onComplete: (v: string) => void
  disabled?: boolean
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const digits = value.padEnd(6, ' ').slice(0, 6).split('').map(c => c === ' ' ? '' : c)

  const focusInput = (index: number) => {
    const el = inputsRef.current[index]
    if (el) el.focus()
  }

  const setDigit = (index: number, digit: string) => {
    const current = value.padEnd(6, ' ').split('')
    current[index] = digit || ' '
    const next = current.join('').trimEnd()
    onChange(next)
    return next
  }

  const handleChange = (index: number, raw: string) => {
    if (disabled) return
    // Only last digit if multiple characters typed
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = setDigit(index, digit)

    if (digit && index < 5) {
      focusInput(index + 1)
    }

    const cleaned = next.replace(/\s/g, '')
    if (cleaned.length === 6) {
      onComplete(cleaned)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '')
      } else if (index > 0) {
        setDigit(index - 1, '')
        focusInput(index - 1)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1)
    } else if (e.key === 'ArrowRight' && index < 5) {
      focusInput(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    onChange(pasted)
    const lastIndex = Math.min(pasted.length - 1, 5)
    focusInput(lastIndex)
    if (pasted.length === 6) {
      onComplete(pasted)
    }
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          autoComplete="one-time-code"
          className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-semibold bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#0168FE] focus:ring-2 focus:ring-[#0168FE]/20 disabled:bg-gray-50 disabled:text-gray-400 transition-all"
        />
      ))}
    </div>
  )
}

function SignupContent() {
  const searchParams = useSearchParams()

  // Step state
  const [step, setStep] = useState<SignupStep>('form')

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tosAgreed, setTosAgreed] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'startup' | 'investor' | null>(null)

  // Invite state
  const [inviteId, setInviteId] = useState<string | null>(null)
  const [inviteEmailLocked, setInviteEmailLocked] = useState(false)
  const [inviteTeamOwnerRole, setInviteTeamOwnerRole] = useState<string | null>(null)
  const [inviteOwnerName, setInviteOwnerName] = useState<string | null>(null)
  const [inviteTeamName, setInviteTeamName] = useState<string | null>(null)
  const [inviteExistingUser, setInviteExistingUser] = useState(false)

  // Claim state (preserved from previous flow)
  const [claimToken, setClaimToken] = useState<string | null>(null)
  const [claimCompanyName, setClaimCompanyName] = useState<string | null>(null)

  // OTP state
  const [signupEmail, setSignupEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSuccess, setOtpSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  // Load invite details
  useEffect(() => {
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
          if (data?.name) setFullName(data.name)
          if (data?.teamOwnerRole) setInviteTeamOwnerRole(data.teamOwnerRole)
          if (data?.teamOwnerName) setInviteOwnerName(data.teamOwnerName)
          if (data?.fundName) setInviteTeamName(data.fundName)
          if (data?.existingUser) setInviteExistingUser(true)
        })
        .catch(() => {})
    }
  }, [searchParams])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0 || resending || !signupEmail) return
    setResending(true)
    setOtpError('')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
      })
      if (error) throw error
      setResendCooldown(60)
    } catch {
      setOtpError('Failed to resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }, [signupEmail, resendCooldown, resending])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Invite signups: validate password confirmation
    if (inviteId && password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const signupRole = claimToken
      ? 'startup'
      : inviteId
        ? (inviteTeamOwnerRole || 'investor')
        : selectedRole

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Fallback redirect only — OTP happens on this page. A click on a
        // legacy email link will land in /auth/confirm which now redirects
        // to /login.
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          role: signupRole,
          ...(fullName ? { full_name: fullName } : {}),
          ...(inviteId ? { invite: inviteId } : {}),
        },
      },
    })

    if (signupError) {
      const msg = signupError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('user already')) {
        setError('An account with this email already exists. Please sign in instead.')
      } else {
        setError(signupError.message)
      }
      setLoading(false)
      return
    }

    if (data.user) {
      // Immediate session (email confirmation disabled) — complete signup directly.
      if (data.session) {
        await completeSignupWithSession(signupRole)
        return
      }

      // Email confirmation ON → move to OTP screen
      setSignupEmail(email)
      setStep('otp')
      setLoading(false)
      return
    }

    setError('Something went wrong. Please try again.')
    setLoading(false)
  }

  async function completeSignupWithSession(signupRole: string | null) {
    try {
      // Handle claim flow first (preserves existing behavior)
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

      // Call complete-signup to create profile + accept invite + set active_team_id
      const res = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: signupRole,
          ...(inviteId ? { inviteId } : {}),
          ...(fullName ? { fullName } : {}),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Failed to complete signup')
        setOtpLoading(false)
        setLoading(false)
        return
      }

      const result = await res.json()

      // Fire welcome email (fire-and-forget)
      fetch('/api/auth/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: result.role || signupRole || 'investor' }),
      }).catch(() => {})

      window.location.href = result.redirectTo || '/dashboard'
    } catch (err) {
      console.error('completeSignupWithSession error:', err)
      setError('Failed to complete signup. Please try again.')
      setOtpLoading(false)
      setLoading(false)
    }
  }

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length !== 6 || otpLoading) return

    setOtpLoading(true)
    setOtpError('')

    const { data, error } = await supabase.auth.verifyOtp({
      email: signupEmail,
      token: code,
      type: 'email',
    })

    if (error || !data.session) {
      setOtpError(error?.message || 'Invalid code. Please try again.')
      setOtpCode('')
      setOtpLoading(false)
      return
    }

    setOtpSuccess(true)

    const signupRole = claimToken
      ? 'startup'
      : inviteId
        ? (inviteTeamOwnerRole || 'investor')
        : selectedRole

    await completeSignupWithSession(signupRole)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpLoading, signupEmail, claimToken, inviteId, inviteTeamOwnerRole, selectedRole])

  function handleUseDifferentEmail() {
    setStep('form')
    setOtpCode('')
    setOtpError('')
    setOtpSuccess(false)
    setSignupEmail('')
  }

  // ====== OTP STEP ======
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <KunfaLogo height={32} />
            </Link>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-600 mb-1">
              Enter the 6-digit code we sent to
            </p>
            <p className="font-semibold text-gray-900 mb-6 break-all">{signupEmail}</p>

            <div className="mb-4">
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={handleVerifyOtp}
                disabled={otpLoading || otpSuccess}
              />
            </div>

            {otpLoading && !otpSuccess && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                <div className="w-4 h-4 border-2 border-[#0168FE] border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            )}

            {otpSuccess && (
              <div className="text-sm text-green-700 font-medium mb-4">
                Verified! Setting up your account...
              </div>
            )}

            {otpError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                {otpError}
              </div>
            )}

            {!otpSuccess && (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resending || otpLoading}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#0168FE] hover:text-[#0050CC] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                  {resending
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend code'
                  }
                </button>

                <div>
                  <button
                    type="button"
                    onClick={handleUseDifferentEmail}
                    disabled={otpLoading}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ====== FORM STEP ======

  // Invite-specific heading
  const inviteHeading = inviteId
    ? (inviteTeamName ? `Join ${inviteTeamName} on Kunfa` : 'Join your team on Kunfa')
    : null

  const inviteSubheading = inviteId && inviteOwnerName
    ? `${inviteOwnerName} has invited you to join their team`
    : inviteId
      ? 'You have been invited to join a team'
      : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <KunfaLogo height={32} />
          </Link>
          {inviteHeading ? (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0168FE]/10 mb-3">
                <Users className="w-6 h-6 text-[#0168FE]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{inviteHeading}</h1>
              {inviteSubheading && (
                <p className="text-gray-500 mt-2">{inviteSubheading}</p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="text-gray-500 mt-2">
                {claimCompanyName ? `Sign up to claim ${claimCompanyName}` : 'Get your startup scored by AI'}
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
          {/* Existing user nudge for invite flow */}
          {inviteId && inviteExistingUser && (
            <div className="mb-5 rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-900 font-medium mb-1">
                You already have a Kunfa account
              </p>
              <p className="text-sm text-blue-700">
                Sign in to accept this invitation.{' '}
                <Link
                  href={`/login?invite=${inviteId}`}
                  className="font-semibold underline hover:no-underline"
                >
                  Go to sign in →
                </Link>
              </p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Role selector — only for normal signups (not invite/claim) */}
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

            {/* Full Name — shown for invite flow */}
            {inviteId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
                  placeholder="Jane Smith"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={inviteEmailLocked}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE] ${inviteEmailLocked ? 'bg-gray-50' : 'bg-white'}`}
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

            {/* Confirm Password — only for invite flow */}
            {inviteId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
                  placeholder="Re-enter password"
                />
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading || !tosAgreed || (!claimToken && !inviteId && !selectedRole)}
              className="w-full py-3 bg-[#0168FE] text-white rounded-lg font-semibold hover:bg-[#0050CC] transition disabled:opacity-50"
            >
              {loading
                ? 'Creating account...'
                : inviteId
                  ? 'Create Account & Join Team'
                  : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Already have an account?{' '}
            <Link
              href={inviteId ? `/login?invite=${inviteId}` : '/login'}
              className="text-[#0168FE] font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
