'use client'

import { useState, useCallback, useEffect } from 'react'
import { upload } from '@vercel/blob/client'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import UploadZone from './UploadZone'
import VoiceRecorder from './VoiceRecorder'
import ProcessingAnimation from './ProcessingAnimation'
import TeaserScore from './TeaserScore'

interface ScoreModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'account' | 'company1' | 'company2' | 'upload' | 'processing' | 'results'

interface ScoreResult {
  overall_score: number
  percentile: number
  summary: string
  investment_readiness: string
  dimensions: {
    team: { score: number; letter_grade: string; headline: string }
    market: { score: number; letter_grade: string; headline: string }
    product: { score: number; letter_grade: string; headline: string }
    financial: { score: number; letter_grade: string; headline: string }
  }
}

const INDUSTRIES = [
  'AI/ML', 'FinTech', 'HealthTech', 'CleanTech',
  'SaaS', 'B2B', 'B2C', 'EdTech',
  'BioTech', 'Real Estate', 'E-Commerce', 'Crypto/Web3',
  'IoT', 'Cybersecurity', 'Consumer', 'Enterprise',
]

const STAGES = [
  { id: 'idea', label: 'Idea Stage', desc: 'Concept only, no product yet' },
  { id: 'pre-seed', label: 'Pre-Seed', desc: 'MVP or early prototype' },
  { id: 'seed', label: 'Seed', desc: 'Product-market fit exploration' },
  { id: 'series-a', label: 'Series A', desc: 'Scaling with proven traction' },
  { id: 'series-b+', label: 'Series B+', desc: 'Growth or late-stage' },
]

const RAISE_RANGES = [
  { id: 'under-250k', label: 'Under $250K' },
  { id: '250k-500k', label: '$250K – $500K' },
  { id: '500k-1m', label: '$500K – $1M' },
  { id: '1m-3m', label: '$1M – $3M' },
  { id: '3m-10m', label: '$3M – $10M' },
  { id: '10m+', label: '$10M+' },
]

async function uploadToBlob(
  file: File | Blob,
  pathname: string,
): Promise<string> {
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  })
  return blob.url
}

export default function ScoreModal({ isOpen, onClose }: ScoreModalProps) {
  const [step, setStep] = useState<Step>('account')
  const [initialLoading, setInitialLoading] = useState(true)

  // Account step
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Company step 1
  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [oneLiner, setOneLiner] = useState('')
  const [companyCountry, setCompanyCountry] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')

  // Company step 2
  const [industry, setIndustry] = useState('')
  const [companyStage, setCompanyStage] = useState('')
  const [raiseAmount, setRaiseAmount] = useState('')

  // Upload step
  const [pitchDeck, setPitchDeck] = useState<File | null>(null)
  const [financials, setFinancials] = useState<File | null>(null)
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [voiceNote, setVoiceNote] = useState<Blob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [submissionId, setSubmissionId] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  // Check auth state on open
  useEffect(() => {
    if (!isOpen) return
    setInitialLoading(true)

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setEmail(user.email || '')

        // Check profile completeness
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, full_name, role')
          .eq('user_id', user.id)
          .single()

        if (profile?.onboarding_completed && profile?.role === 'startup') {
          setStep('upload')
        } else if (profile?.full_name) {
          // Has some profile data but not complete — go to company2
          setStep('company2')
        } else {
          setStep('company1')
        }
      } else {
        setStep('account')
      }
      setInitialLoading(false)
    }

    checkAuth()
  }, [isOpen])

  // Account step handlers
  const handleAuth = async () => {
    setAuthError('')
    setAuthLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setAuthError(error.message); return }
        if (data.user) {
          setUserId(data.user.id)
          // Check if onboarding done
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed, full_name, role')
            .eq('user_id', data.user.id)
            .single()

          if (profile?.onboarding_completed && profile?.role === 'startup') {
            setStep('upload')
          } else if (profile?.full_name) {
            setStep('company2')
          } else {
            setStep('company1')
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        })
        if (error) { setAuthError(error.message); return }
        if (data.user && data.session) {
          setUserId(data.user.id)
          // Create profile stub
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            email,
          }, { onConflict: 'user_id' })
          setStep('company1')
        } else if (data.user && !data.session) {
          setAuthError('Check your email to confirm your account, then try again.')
        }
      }
    } catch {
      setAuthError('Something went wrong. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    })
  }

  const handleLinkedInLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    })
  }

  // Company step 1 validation
  const isCompany1Valid = fullName && companyName && oneLiner

  // Company step 2 validation
  const isCompany2Valid = industry && companyStage && raiseAmount

  // Save company profile
  const handleSaveProfile = async () => {
    setAuthLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'startup',
          full_name: fullName,
          job_title: jobTitle,
          company_name: companyName,
          one_liner: oneLiner,
          company_country: companyCountry,
          company_website: companyWebsite,
          industry,
          company_stage: companyStage,
          raise_amount: raiseAmount,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      setStep('upload')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setAuthLoading(false)
    }
  }

  // Upload step
  const isUploadValid = pitchDeck && financials && linkedinUrl

  const handleSubmit = useCallback(async () => {
    if (!isUploadValid || isSubmitting || !pitchDeck || !financials) return
    setError('')
    setIsSubmitting(true)
    setStep('processing')

    try {
      const timestamp = Date.now()
      let pitchDeckUrl: string
      let financialsUrl: string
      let voiceNoteUrl: string | undefined

      try {
        setUploadProgress('Uploading pitch deck...')
        pitchDeckUrl = await uploadToBlob(
          pitchDeck,
          `submissions/${timestamp}/pitch-deck-${pitchDeck.name}`,
        )
        setUploadProgress('Uploading financials...')
        financialsUrl = await uploadToBlob(
          financials,
          `submissions/${timestamp}/financials-${financials.name}`,
        )
        if (voiceNote) {
          setUploadProgress('Uploading voice note...')
          voiceNoteUrl = await uploadToBlob(
            voiceNote,
            `submissions/${timestamp}/voice-note.webm`,
          )
        }
      } catch (uploadErr) {
        throw new Error(
          `File upload failed: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}. Check that BLOB_READ_WRITE_TOKEN is configured.`,
        )
      }

      setUploadProgress('')

      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          linkedinUrl,
          pitchDeckUrl,
          pitchDeckFilename: pitchDeck.name,
          financialsUrl,
          financialsFilename: financials.name,
          voiceNoteUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status})`)
      }

      setScoreResult(data.teaser)
      setSubmissionId(data.submissionId)
      if (data.slug) {
        setSlug(data.slug)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('upload')
    } finally {
      setIsSubmitting(false)
      setUploadProgress('')
    }
  }, [email, pitchDeck, financials, linkedinUrl, voiceNote, isUploadValid, isSubmitting])

  const handleProcessingComplete = useCallback(() => {
    if (scoreResult) {
      if (slug) {
        window.location.href = `/company/${slug}`
        return
      }
      setStep('results')
    }
  }, [scoreResult, slug])

  const handleUnlock = useCallback(async () => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Failed to initiate checkout. Please try again.')
    }
  }, [submissionId])

  const handleClose = () => {
    setStep('account')
    setEmail('')
    setPassword('')
    setIsLogin(false)
    setAuthError('')
    setUserId(null)
    setFullName('')
    setJobTitle('')
    setCompanyName('')
    setOneLiner('')
    setCompanyCountry('')
    setCompanyWebsite('')
    setIndustry('')
    setCompanyStage('')
    setRaiseAmount('')
    setPitchDeck(null)
    setFinancials(null)
    setLinkedinUrl('')
    setVoiceNote(null)
    setScoreResult(null)
    setSubmissionId('')
    setSlug('')
    setError('')
    setUploadProgress('')
    onClose()
  }

  const STEP_LABELS = [
    { key: 'account', label: 'Account' },
    { key: 'company1', label: 'Company' },
    { key: 'company2', label: 'Details' },
    { key: 'upload', label: 'Upload' },
  ]
  const stepOrder = ['account', 'company1', 'company2', 'upload', 'processing', 'results']
  const currentIdx = stepOrder.indexOf(step)

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-kunfa-navy">Get Your Kunfa Score</h2>
        </div>

        {/* Progress Steps — only show for first 4 steps */}
        {currentIdx <= 3 && !initialLoading && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEP_LABELS.map((s, i) => {
              const thisIdx = stepOrder.indexOf(s.key)
              const isActive = thisIdx <= currentIdx
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && (
                    <div className={`w-8 h-0.5 ${isActive ? 'bg-kunfa-green' : 'bg-gray-200'}`} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isActive ? 'bg-kunfa-green text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${isActive ? 'text-kunfa-navy' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {(error || authError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-600">{error || authError}</p>
          </div>
        )}

        {initialLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kunfa-green" />
          </div>
        )}

        {/* STEP 1: Account */}
        {!initialLoading && step === 'account' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <button onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
              <button onClick={handleLinkedInLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#0A66C2] text-white rounded-lg text-sm font-medium hover:bg-[#004182] transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                Continue with LinkedIn
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">or</span></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@company.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters" minLength={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent"
              />
            </div>

            <button onClick={handleAuth} disabled={authLoading || !email || !password}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                email && password ? 'bg-kunfa-green hover:bg-kunfa-green-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {authLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <p className="text-center text-xs text-gray-500">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setIsLogin(!isLogin); setAuthError('') }} className="text-kunfa-green font-medium hover:underline">
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        )}

        {/* STEP 2: Company Page 1 */}
        {!initialLoading && step === 'company1' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Full Name *</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Job Title</label>
                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="CEO & Co-Founder"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Company Name *</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">One-liner *</label>
              <input type="text" value={oneLiner} onChange={(e) => setOneLiner(e.target.value)}
                placeholder="What does your company do in one sentence?"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Country</label>
                <input type="text" value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)}
                  placeholder="United States"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Website</label>
                <input type="url" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://acme.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent" />
              </div>
            </div>

            <button onClick={() => setStep('company2')} disabled={!isCompany1Valid}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                isCompany1Valid ? 'bg-kunfa-green hover:bg-kunfa-green-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              Continue
            </button>
          </div>
        )}

        {/* STEP 3: Company Page 2 */}
        {!initialLoading && step === 'company2' && (
          <div className="space-y-5">
            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-2">Industry *</label>
              <div className="grid grid-cols-4 gap-2">
                {INDUSTRIES.map((ind) => (
                  <button key={ind} onClick={() => setIndustry(ind)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                      industry === ind
                        ? 'bg-kunfa-green text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-2">Company Stage *</label>
              <div className="space-y-2">
                {STAGES.map((s) => (
                  <button key={s.id} onClick={() => setCompanyStage(s.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                      companyStage === s.id
                        ? 'border-kunfa-green bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <span className={`text-sm font-medium ${companyStage === s.id ? 'text-kunfa-green' : 'text-kunfa-navy'}`}>
                      {s.label}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Raise Amount */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-2">Raise Amount *</label>
              <div className="grid grid-cols-3 gap-2">
                {RAISE_RANGES.map((r) => (
                  <button key={r.id} onClick={() => setRaiseAmount(r.id)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                      raiseAmount === r.id
                        ? 'bg-kunfa-green text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('company1')}
                className="flex-1 py-3 rounded-lg font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                Back
              </button>
              <button onClick={handleSaveProfile} disabled={!isCompany2Valid || authLoading}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                  isCompany2Valid ? 'bg-kunfa-green hover:bg-kunfa-green-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}>
                {authLoading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Upload */}
        {!initialLoading && step === 'upload' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Pitch Deck</label>
              <UploadZone
                label="Tap to upload"
                subtitle="PDF, PPT, Keynote — up to 50 MB"
                required={true}
                accept=".pdf,.ppt,.pptx,.key"
                file={pitchDeck}
                onFileSelect={setPitchDeck}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Financials & Metrics</label>
              <UploadZone
                label="Tap to upload"
                subtitle="Financials, data room — up to 50 MB"
                required={true}
                accept=".pdf,.xlsx,.xls,.csv"
                file={financials}
                onFileSelect={setFinancials}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">
                LinkedIn Profile URL
                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">REQUIRED</span>
              </label>
              <input
                type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Voice Note</label>
              <VoiceRecorder recording={voiceNote} onRecordingComplete={setVoiceNote} />
            </div>

            <div className="flex items-center gap-4 pt-2">
              {[
                { label: 'Pitch deck', done: !!pitchDeck },
                { label: 'Financials', done: !!financials },
                { label: 'LinkedIn', done: !!linkedinUrl },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    item.done ? 'bg-kunfa-green' : 'bg-gray-200'
                  }`}>
                    {item.done && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs ${item.done ? 'text-kunfa-navy font-medium' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <button onClick={handleSubmit} disabled={!isUploadValid || isSubmitting}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                isUploadValid
                  ? 'bg-kunfa-green hover:bg-kunfa-green-dark text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              GENERATE SCORE
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div>
            {uploadProgress && (
              <p className="text-center text-sm text-kunfa-text-secondary mb-4">{uploadProgress}</p>
            )}
            <ProcessingAnimation onComplete={handleProcessingComplete} />
          </div>
        )}

        {step === 'results' && scoreResult && (
          <TeaserScore
            result={scoreResult}
            submissionId={submissionId}
            onUnlock={handleUnlock}
          />
        )}
      </div>
    </Modal>
  )
}
