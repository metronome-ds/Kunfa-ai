'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Building2, TrendingUp } from 'lucide-react'
import KunfaLogo from '@/components/common/KunfaLogo'

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
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

  useEffect(() => {
    if (searchParams.get('step') === 'role') {
      // Coming from OAuth callback — user needs to pick a role
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      if (data.session) {
        // Auto-confirmed — create profile and show role selection
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          email,
        })
        setUserId(data.user.id)
        setShowRoleSelection(true)
      } else {
        // Email confirmation required
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

    if (role === 'startup') {
      window.location.href = '/'
    } else {
      window.location.href = '/onboarding'
    }
  }

  if (showRoleSelection) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="mb-6">
              <KunfaLogo height={32} inverted />
            </div>
            <h1 className="text-2xl font-bold text-white">How will you use Kunfa?</h1>
            <p className="text-gray-400 mt-2">Choose your role to get started</p>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3 mb-6">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleRoleSelect('startup')}
              disabled={loading}
              className="group bg-[#1E293B] rounded-xl p-8 border-2 border-gray-700 hover:border-[#10B981] transition-all text-left disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-xl bg-[#10B981]/20 flex items-center justify-center mb-4 group-hover:bg-[#10B981]/30 transition">
                <Building2 className="w-7 h-7 text-[#10B981]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">I'm a Startup</h3>
              <p className="text-sm text-gray-400">Get your pitch scored by AI and connect with investors</p>
            </button>

            <button
              onClick={() => handleRoleSelect('investor')}
              disabled={loading}
              className="group bg-[#1E293B] rounded-xl p-8 border-2 border-gray-700 hover:border-blue-500 transition-all text-left disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition">
                <TrendingUp className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">I'm an Investor</h3>
              <p className="text-sm text-gray-400">Discover deals, manage pipeline, and track portfolio</p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#10B981]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 mb-6">
            We sent a confirmation link to <strong className="text-white">{email}</strong>. Click the link to activate your account.
          </p>
          <Link href="/login" className="text-[#10B981] hover:underline text-sm">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <KunfaLogo height={32} inverted />
          </Link>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400 mt-2">Get your startup scored by AI</p>
        </div>

        <div className="bg-[#1E293B] rounded-xl p-8 border border-gray-700">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                placeholder="Min 6 characters" />
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={tosAgreed}
                onChange={(e) => setTosAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#10B981] focus:ring-[#10B981]"
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-[#10B981] hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-[#10B981] hover:underline">Privacy Policy</Link>
              </span>
            </label>

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">{error}</div>
            )}

            <button type="submit" disabled={loading || !tosAgreed}
              className="w-full py-3 bg-[#10B981] text-white rounded-lg font-semibold hover:bg-[#059669] transition disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#10B981] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
