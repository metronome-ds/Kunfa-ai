'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import KunfaLogo from '@/components/common/KunfaLogo'
import { RefreshCw } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0168FE]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Show error from URL params (e.g. confirmation_failed from /auth/confirm)
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError === 'confirmation_failed' || urlError === 'verification_failed') {
      setError('Email confirmation failed. The link may have expired. Please try signing up again.')
    }
  }, [searchParams])

  // Resend confirmation state (shown when user has unconfirmed email)
  const [showResendConfirm, setShowResendConfirm] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState('')

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
      })
      if (error) throw error
      setResendCooldown(60)
      setError('Confirmation email sent! Check your inbox.')
      setShowResendConfirm(false)
    } catch {
      setError('Failed to resend confirmation email. Please try again.')
    } finally {
      setResending(false)
    }
  }, [email, resendCooldown, resending])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Detect unconfirmed email error from Supabase
        const msg = error.message.toLowerCase()
        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          setError('Please confirm your email address first. Check your inbox for the confirmation link.')
          setShowResendConfirm(true)
        } else {
          setError(error.message)
          setShowResendConfirm(false)
        }
        setIsLoading(false)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', data.user.id)
          .single()

        if (profile?.onboarding_completed) {
          window.location.href = '/dashboard'
        } else {
          window.location.href = '/onboarding'
        }
        return
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setIsLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    setForgotError('')

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: 'https://kunfa.ai/reset-password',
    })

    if (error) {
      setForgotError(error.message)
    } else {
      setForgotSent(true)
    }
    setForgotLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <KunfaLogo height={32} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
          {/* Forgot Password View */}
          {showForgot ? (
            forgotSent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#0168FE]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#0168FE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
                <p className="text-sm text-gray-500 mb-6">
                  We sent a password reset link to <strong className="text-gray-900">{forgotEmail}</strong>
                </p>
                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail('') }}
                  className="text-[#0168FE] text-sm font-medium hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Reset your password</h2>
                <p className="text-sm text-gray-500 mb-5">Enter your email and we&apos;ll send you a reset link.</p>

                {forgotError && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-200">
                    <p className="text-red-700 text-sm">{forgotError}</p>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#0168FE] focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail}
                    className="w-full rounded-lg bg-[#0168FE] hover:bg-[#0050CC] disabled:opacity-50 px-4 py-3 text-white font-semibold transition-all"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <button
                  onClick={() => { setShowForgot(false); setForgotError('') }}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700 font-medium w-full text-center"
                >
                  Back to sign in
                </button>
              </div>
            )
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-200">
                  <p className="text-red-700 text-sm">{error}</p>
                  {showResendConfirm && (
                    <button
                      onClick={handleResendConfirmation}
                      disabled={resendCooldown > 0 || resending}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0168FE] hover:text-[#0050CC] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                      {resending
                        ? 'Sending...'
                        : resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : 'Resend confirmation email'
                      }
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#0168FE] focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setForgotEmail(email) }}
                      className="text-xs text-[#0168FE] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#0168FE] focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0168FE] hover:bg-[#0050CC] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-white font-semibold transition-all"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <p className="text-center text-gray-500 text-sm mt-6">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-[#0168FE] font-medium hover:underline">
                  Create one
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
