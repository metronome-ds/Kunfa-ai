'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type CompanyType = 'startup' | 'investor' | 'service_provider'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [companyType, setCompanyType] = useState<CompanyType | ''>('')
  const [companyName, setCompanyName] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleComplete() {
    if (!companyType || !companyName) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        company_type: companyType,
        company_name: companyName,
        linkedin_url: linkedinUrl || null,
        role: companyType === 'startup' ? 'founder' : companyType,
        onboarding_completed: true,
      })
      .eq('user_id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  const typeOptions = [
    { value: 'startup' as CompanyType, label: 'Startup / Founder', desc: 'Get your startup scored and generate investment memos', icon: '🚀' },
    { value: 'investor' as CompanyType, label: 'Investor', desc: 'Discover and evaluate startups with AI-powered insights', icon: '💼' },
    { value: 'service_provider' as CompanyType, label: 'Service Provider', desc: 'Connect with startups and investors', icon: '🔧' },
  ]

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#10B981] flex items-center justify-center">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <span className="text-white font-bold text-xl">Kunfa.AI</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Set up your profile</h1>
          <p className="text-gray-400 mt-2">Step {step} of 2</p>
          <div className="flex gap-2 justify-center mt-4">
            <div className={`h-1 w-16 rounded ${step >= 1 ? 'bg-[#10B981]' : 'bg-gray-600'}`}></div>
            <div className={`h-1 w-16 rounded ${step >= 2 ? 'bg-[#10B981]' : 'bg-gray-600'}`}></div>
          </div>
        </div>

        <div className="bg-[#1E293B] rounded-xl p-8 border border-gray-700">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">What describes you best?</h2>
              <div className="space-y-3">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setCompanyType(opt.value); setStep(2) }}
                    className={`w-full text-left px-4 py-4 rounded-lg border transition ${
                      companyType === opt.value
                        ? 'border-[#10B981] bg-[#10B981]/10'
                        : 'border-gray-600 hover:border-gray-500 bg-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <div className="text-white font-medium">{opt.label}</div>
                        <div className="text-gray-400 text-sm">{opt.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Company details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#0F172A] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    placeholder="Your company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">LinkedIn URL (optional)</label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0F172A] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">{error}</div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition">
                    Back
                  </button>
                  <button onClick={handleComplete} disabled={loading || !companyName}
                    className="flex-1 py-3 bg-[#10B981] text-white rounded-lg font-semibold hover:bg-[#059669] transition disabled:opacity-50">
                    {loading ? 'Saving...' : 'Complete Setup'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
