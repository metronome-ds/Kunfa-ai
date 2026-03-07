'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import UploadZone from './UploadZone'
import VoiceRecorder from './VoiceRecorder'
import ProcessingAnimation from './ProcessingAnimation'
import TeaserScore from './TeaserScore'
import { Check, X, Loader2 } from 'lucide-react'

interface ScoreModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'account' | 'company' | 'founder' | 'upload' | 'processing' | 'results'

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
  'AI & Machine Learning',
  'B2B SaaS',
  'B2C',
  'Biotech & Life Sciences',
  'CleanTech & Energy',
  'Consumer Hardware',
  'Cybersecurity',
  'DevTools & Infrastructure',
  'E-commerce & Marketplace',
  'EdTech',
  'FinTech',
  'Food & Beverage',
  'Gaming',
  'HealthTech',
  'Logistics & Supply Chain',
  'Media & Entertainment',
  'PropTech & Real Estate',
  'Social',
  'Travel & Hospitality',
  'Web3 & Crypto',
  'Other',
] as const

const STAGES = [
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c+', label: 'Series C+' },
  { value: 'growth', label: 'Growth' },
] as const

const INPUT_CLASS = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent'
const SELECT_CLASS = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function isSlugFormatValid(slug: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$/.test(slug)
}

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

  // Company step
  const [companyName, setCompanyName] = useState('')
  const [chosenSlug, setChosenSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [oneLiner, setOneLiner] = useState('')
  const [industry, setIndustry] = useState('')
  const [companyStage, setCompanyStage] = useState('')
  const [companyCountry, setCompanyCountry] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')

  // Founder step
  const [founderName, setFounderName] = useState('')
  const [founderTitle, setFounderTitle] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [teamSize, setTeamSize] = useState('')

  // Upload step
  const [pitchDeck, setPitchDeck] = useState<File | null>(null)
  const [financials, setFinancials] = useState<File | null>(null)
  const [voiceNote, setVoiceNote] = useState<Blob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [submissionId, setSubmissionId] = useState('')
  const [resultSlug, setResultSlug] = useState('')
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  const slugCheckTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-generate slug from company name (only if not manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && companyName) {
      const generated = generateSlug(companyName)
      setChosenSlug(generated)
    } else if (!companyName) {
      setChosenSlug('')
      setSlugStatus('idle')
    }
  }, [companyName, slugManuallyEdited])

  // Debounced slug uniqueness check
  useEffect(() => {
    if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current)

    if (!chosenSlug || chosenSlug.length < 3) {
      setSlugStatus(chosenSlug.length > 0 ? 'invalid' : 'idle')
      return
    }

    if (!isSlugFormatValid(chosenSlug)) {
      setSlugStatus('invalid')
      return
    }

    setSlugStatus('checking')
    slugCheckTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/company/check-slug?slug=${encodeURIComponent(chosenSlug)}`)
        const data = await res.json()
        setSlugStatus(data.available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 500)

    return () => {
      if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current)
    }
  }, [chosenSlug])

  // Check auth state on open
  useEffect(() => {
    if (!isOpen) return
    setInitialLoading(true)

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setEmail(user.email || '')

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, full_name, company_name, role')
          .eq('user_id', user.id)
          .single()

        if (profile?.onboarding_completed && profile?.role === 'startup') {
          setStep('upload')
        } else if (profile?.company_name) {
          setStep('founder')
          if (profile?.full_name) setFounderName(profile.full_name)
        } else {
          setStep('company')
        }
      } else {
        setStep('account')
      }
      setInitialLoading(false)
    }

    checkAuth()
  }, [isOpen])

  // Account handlers
  const handleAuth = async () => {
    setAuthError('')
    setAuthLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setAuthError(error.message); return }
        if (data.user) {
          setUserId(data.user.id)
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed, full_name, company_name, role')
            .eq('user_id', data.user.id)
            .single()

          if (profile?.onboarding_completed && profile?.role === 'startup') {
            setStep('upload')
          } else if (profile?.company_name) {
            setStep('founder')
            if (profile?.full_name) setFounderName(profile.full_name)
          } else {
            setStep('company')
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
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            email,
          }, { onConflict: 'user_id' })
          setStep('company')
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

  // Validation
  const isCompanyValid = companyName && chosenSlug && slugStatus === 'available' && oneLiner && industry && companyStage && companyCountry
  const isFounderValid = founderName && founderTitle
  const isUploadValid = pitchDeck && financials

  // Save profile (called at end of founder step)
  const handleSaveProfile = async () => {
    setAuthLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'startup',
          full_name: founderName,
          job_title: founderTitle,
          company_name: companyName,
          one_liner: oneLiner,
          company_country: companyCountry,
          company_website: companyWebsite,
          industry,
          company_stage: companyStage,
          linkedin_url: linkedinUrl,
          team_size: teamSize ? parseInt(teamSize) : undefined,
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

  // Submit for scoring
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
          slug: chosenSlug,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status})`)
      }

      setScoreResult(data.teaser)
      setSubmissionId(data.submissionId)
      if (data.slug) {
        setResultSlug(data.slug)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('upload')
    } finally {
      setIsSubmitting(false)
      setUploadProgress('')
    }
  }, [email, chosenSlug, pitchDeck, financials, linkedinUrl, voiceNote, isUploadValid, isSubmitting])

  const handleProcessingComplete = useCallback(() => {
    if (scoreResult) {
      if (resultSlug) {
        window.location.href = `/company/${resultSlug}`
        return
      }
      setStep('results')
    }
  }, [scoreResult, resultSlug])

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
    setCompanyName('')
    setChosenSlug('')
    setSlugStatus('idle')
    setSlugManuallyEdited(false)
    setOneLiner('')
    setIndustry('')
    setCompanyStage('')
    setCompanyCountry('')
    setCompanyWebsite('')
    setFounderName('')
    setFounderTitle('')
    setLinkedinUrl('')
    setTeamSize('')
    setPitchDeck(null)
    setFinancials(null)
    setVoiceNote(null)
    setScoreResult(null)
    setSubmissionId('')
    setResultSlug('')
    setError('')
    setUploadProgress('')
    onClose()
  }

  const STEP_LABELS = [
    { key: 'account', label: 'Account' },
    { key: 'company', label: 'Company' },
    { key: 'founder', label: 'Founder' },
    { key: 'upload', label: 'Upload' },
  ]
  const stepOrder: Step[] = ['account', 'company', 'founder', 'upload', 'processing', 'results']
  const currentIdx = stepOrder.indexOf(step)

  const handleSlugChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setChosenSlug(sanitized.slice(0, 40))
    setSlugManuallyEdited(true)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-kunfa-navy">Get Your Kunfa Score</h2>
        </div>

        {/* Progress Steps */}
        {currentIdx <= 3 && !initialLoading && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEP_LABELS.map((s, i) => {
              const thisIdx = stepOrder.indexOf(s.key as Step)
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
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters" minLength={6}
                className={INPUT_CLASS}
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

        {/* STEP 2: Company */}
        {!initialLoading && step === 'company' && (
          <div className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Company Name *</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className={INPUT_CLASS} />
            </div>

            {/* Slug Picker */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Your Kunfa URL *</label>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 bg-gray-50 px-3 py-2.5 rounded-l-lg border border-r-0 border-gray-300 whitespace-nowrap">
                  kunfa.ai/company/
                </span>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chosenSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="your-company"
                    className="w-full border border-gray-300 rounded-r-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent pr-10"
                  />
                  {/* Status indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {slugStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
                    {slugStatus === 'available' && <Check className="h-4 w-4 text-emerald-500" />}
                    {slugStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
                    {slugStatus === 'invalid' && <X className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
              </div>
              {slugStatus === 'taken' && (
                <p className="text-xs text-red-500 mt-1">This URL is already taken. Try another.</p>
              )}
              {slugStatus === 'invalid' && chosenSlug.length > 0 && (
                <p className="text-xs text-red-500 mt-1">3-40 characters, lowercase letters, numbers, and hyphens only.</p>
              )}
              {slugStatus === 'available' && (
                <p className="text-xs text-emerald-600 mt-1">This URL is available!</p>
              )}
            </div>

            {/* One-liner */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">
                Elevator Pitch *
                <span className="ml-2 text-xs font-normal text-gray-400">{oneLiner.length}/160</span>
              </label>
              <input type="text" value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value.slice(0, 160))}
                placeholder="What does your company do in one sentence?"
                maxLength={160}
                className={INPUT_CLASS} />
            </div>

            {/* Industry Dropdown */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Industry *</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* Stage Dropdown */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Stage *</label>
              <select
                value={companyStage}
                onChange={(e) => setCompanyStage(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Select stage...</option>
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Country + Website */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Country / HQ *</label>
                <input type="text" value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)}
                  placeholder="United States"
                  className={INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Website</label>
                <input type="url" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://acme.com"
                  className={INPUT_CLASS} />
              </div>
            </div>

            <button onClick={() => setStep('founder')} disabled={!isCompanyValid}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                isCompanyValid ? 'bg-kunfa-green hover:bg-kunfa-green-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              Continue
            </button>
          </div>
        )}

        {/* STEP 3: Founder & Team */}
        {!initialLoading && step === 'founder' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Founder Name *</label>
                <input type="text" value={founderName} onChange={(e) => setFounderName(e.target.value)}
                  placeholder="Jane Smith"
                  className={INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Title *</label>
                <input type="text" value={founderTitle} onChange={(e) => setFounderTitle(e.target.value)}
                  placeholder="CEO & Co-Founder"
                  className={INPUT_CLASS} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">LinkedIn URL</label>
              <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className={INPUT_CLASS} />
            </div>

            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Team Size</label>
              <input type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}
                placeholder="e.g. 5"
                min="1"
                className={INPUT_CLASS} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('company')}
                className="flex-1 py-3 rounded-lg font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                Back
              </button>
              <button onClick={handleSaveProfile} disabled={!isFounderValid || authLoading}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                  isFounderValid ? 'bg-kunfa-green hover:bg-kunfa-green-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Pitch Deck *</label>
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
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Financials & Metrics *</label>
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
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Voice Note</label>
              <VoiceRecorder recording={voiceNote} onRecordingComplete={setVoiceNote} />
            </div>

            <div className="flex items-center gap-4 pt-2">
              {[
                { label: 'Pitch deck', done: !!pitchDeck },
                { label: 'Financials', done: !!financials },
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
