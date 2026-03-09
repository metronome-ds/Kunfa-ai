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

  useEffect(() => {
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
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          email,
        })
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
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#0168FE]/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#0168FE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-6">
            We sent a confirmation link to <strong className="text-gray-900">{email}</strong>. Click the link to activate your account.
          </p>
          <Link href="/login" className="text-[#0168FE] hover:underline text-sm font-medium">
            Back to login
          </Link>
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
          <p className="text-gray-600 mt-2">Get your startup scored by AI</p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
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

            <button type="submit" disabled={loading || !tosAgreed}
              className="w-full py-2.5 bg-[#0168FE] text-white rounded-lg font-semibold hover:bg-[#0050CC] transition disabled:opacity-50">
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
