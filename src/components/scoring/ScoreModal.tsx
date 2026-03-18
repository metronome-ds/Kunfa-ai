'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import UploadZone from './UploadZone'
import ProcessingAnimation from './ProcessingAnimation'
import TeaserScore from './TeaserScore'
import { Check, X, Loader2 } from 'lucide-react'
import { STAGES, INDUSTRIES } from '@/lib/constants'

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

// STAGES and INDUSTRIES imported from @/lib/constants

const INPUT_CLASS = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-kunfa focus:border-transparent'
const SELECT_CLASS = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kunfa focus:border-transparent'

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

async function uploadToStorage(
  file: File | Blob,
  pathname: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(pathname, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error('Upload failed. Please try again.')
  }

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path)

  return publicUrl
}

export default function ScoreModal({ isOpen, onClose }: ScoreModalProps) {
  const [step, setStep] = useState<Step>('account')
  const [initialLoading, setInitialLoading] = useState(true)

  // Account step
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
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
  const [companyLinkedinUrl, setCompanyLinkedinUrl] = useState('')

  // Founder step
  const [founderName, setFounderName] = useState('')
  const [founderTitle, setFounderTitle] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [coFounders, setCoFounders] = useState<{ name: string; title: string; email: string; linkedin: string }[]>([])

  const addCoFounder = () => {
    if (coFounders.length < 4) {
      setCoFounders([...coFounders, { name: '', title: '', email: '', linkedin: '' }])
    }
  }

  const removeCoFounder = (index: number) => {
    setCoFounders(coFounders.filter((_, i) => i !== index))
  }

  const updateCoFounder = (index: number, field: string, value: string) => {
    setCoFounders(coFounders.map((cf, i) => i === index ? { ...cf, [field]: value } : cf))
  }

  // Upload step
  const [disclaimerChecked, setDisclaimerChecked] = useState(false)
  const [pitchDeck, setPitchDeck] = useState<File | null>(null)
  const [financials, setFinancials] = useState<File | null>(null)
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
          .select('onboarding_completed, full_name, company_name, role, linkedin_url')
          .eq('user_id', user.id)
          .single()

        if (profile?.full_name) setFullName(profile.full_name)
        if (profile?.linkedin_url) setLinkedinUrl(profile.linkedin_url)

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
            .select('onboarding_completed, full_name, company_name, role, linkedin_url')
            .eq('user_id', data.user.id)
            .single()

          if (profile?.full_name) setFullName(profile.full_name)
          if (profile?.linkedin_url) setLinkedinUrl(profile.linkedin_url)

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
          // Save full_name and linkedin_url to profile on signup
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            email,
            full_name: fullName || undefined,
            linkedin_url: linkedinUrl || undefined,
          }, { onConflict: 'user_id' })
          setFounderName(fullName) // Pre-fill founder name from full name
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

  // Validation
  const isAccountValid = email && password && password.length >= 6 && fullName
  const isCompanyValid = companyName && chosenSlug && slugStatus === 'available' && oneLiner && industry && companyStage && companyCountry
  const isFounderValid = founderName && founderTitle && coFounders.every(cf => cf.name && cf.title && cf.email)
  const isUploadValid = !!pitchDeck && disclaimerChecked

  // Save company data to profile (called at end of company step)
  const handleSaveCompany = async () => {
    setAuthLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'startup',
          full_name: fullName,
          linkedin_url: linkedinUrl || undefined,
          company_name: companyName,
          one_liner: oneLiner,
          company_country: companyCountry,
          company_website: companyWebsite || undefined,
          industry,
          company_stage: companyStage,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save company info')
      }

      setStep('founder')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company info')
    } finally {
      setAuthLoading(false)
    }
  }

  // Save founder data to profile (called at end of founder step)
  const handleSaveFounder = async () => {
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
          team_size: teamSize ? parseInt(teamSize) : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save founder info')
      }

      setStep('upload')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save founder info')
    } finally {
      setAuthLoading(false)
    }
  }

  // Submit for scoring
  const handleSubmit = useCallback(async () => {
    if (!isUploadValid || isSubmitting || !pitchDeck) return
    setError('')
    setIsSubmitting(true)
    setStep('processing')

    try {
      const timestamp = Date.now()
      let pitchDeckUrl: string
      let financialsUrl: string | undefined
      let financialsFilename: string | undefined

      try {
        setUploadProgress('Uploading pitch deck...')
        pitchDeckUrl = await uploadToStorage(
          pitchDeck,
          `submissions/${timestamp}/pitch-deck-${pitchDeck.name}`,
        )
        if (financials) {
          setUploadProgress('Uploading financials...')
          financialsUrl = await uploadToStorage(
            financials,
            `submissions/${timestamp}/financials-${financials.name}`,
          )
          financialsFilename = financials.name
        }
      } catch (uploadErr) {
        throw new Error(
          uploadErr instanceof Error ? uploadErr.message : 'Upload failed. Please try again.',
        )
      }

      setUploadProgress('')

      // Build founding_team array: main founder first, then co-founders
      const foundingTeam = [
        { name: founderName, title: founderTitle, email, linkedin: linkedinUrl || '' },
        ...coFounders.filter(cf => cf.name && cf.title && cf.email),
      ]

      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          linkedinUrl: linkedinUrl || undefined,
          companyLinkedinUrl: companyLinkedinUrl || undefined,
          pitchDeckUrl,
          pitchDeckFilename: pitchDeck.name,
          financialsUrl,
          financialsFilename,
          slug: chosenSlug,
          foundingTeam,
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
  }, [email, chosenSlug, pitchDeck, financials, linkedinUrl, isUploadValid, isSubmitting])

  const handleProcessingComplete = useCallback(() => {
    if (scoreResult) {
      if (submissionId) {
        window.location.href = `/score/${submissionId}`
        return
      }
      setStep('results')
    }
  }, [scoreResult, submissionId])

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
    setFullName('')
    setLinkedinUrl('')
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
    setCompanyLinkedinUrl('')
    setFounderName('')
    setFounderTitle('')
    setTeamSize('')
    setCoFounders([])
    setDisclaimerChecked(false)
    setPitchDeck(null)
    setFinancials(null)
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
                    <div className={`w-8 h-0.5 ${isActive ? 'bg-kunfa' : 'bg-gray-200'}`} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isActive ? 'bg-kunfa text-white' : 'bg-gray-200 text-gray-500'
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kunfa" />
          </div>
        )}

        {/* STEP 1: Account */}
        {!initialLoading && step === 'account' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Full Name *</label>
              <input
                type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Email *</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@company.com"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Password *</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters" minLength={6}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">LinkedIn Profile URL</label>
              <input
                type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className={INPUT_CLASS}
              />
            </div>

            <button onClick={handleAuth} disabled={authLoading || !isAccountValid}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                isAccountValid ? 'bg-kunfa hover:bg-kunfa-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {authLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <p className="text-center text-xs text-gray-500">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setIsLogin(!isLogin); setAuthError('') }} className="text-kunfa font-medium hover:underline">
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
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Choose Your URL *</label>
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
                    className="w-full border border-gray-300 rounded-r-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-kunfa focus:border-transparent pr-10"
                  />
                  {/* Status indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {slugStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
                    {slugStatus === 'available' && <Check className="h-4 w-4 text-[#0168FE]" />}
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
                <p className="text-xs text-[#0168FE] mt-1">This URL is available!</p>
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
                  <option key={s} value={s}>{s}</option>
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

            {/* Company LinkedIn */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Company LinkedIn URL</label>
              <input type="url" value={companyLinkedinUrl} onChange={(e) => setCompanyLinkedinUrl(e.target.value)}
                placeholder="linkedin.com/company/your-company"
                className={INPUT_CLASS} />
            </div>

            <button onClick={handleSaveCompany} disabled={!isCompanyValid || authLoading}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                isCompanyValid ? 'bg-kunfa hover:bg-kunfa-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {authLoading ? 'Saving...' : 'Continue'}
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
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Team Size</label>
              <input type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}
                placeholder="e.g. 5"
                min="1"
                className={INPUT_CLASS} />
            </div>

            {/* Co-Founders */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-kunfa-navy">Co-Founders</label>
                {coFounders.length < 4 && (
                  <button
                    type="button"
                    onClick={addCoFounder}
                    className="text-sm text-kunfa font-medium hover:text-kunfa-dark transition"
                  >
                    + Add Co-Founder
                  </button>
                )}
              </div>

              {coFounders.length === 0 && (
                <p className="text-xs text-gray-400 mb-2">No co-founders added yet. Click above to add up to 4.</p>
              )}

              <div className="space-y-3">
                {coFounders.map((cf, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 relative">
                    <button
                      type="button"
                      onClick={() => removeCoFounder(i)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"
                      aria-label="Remove co-founder"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                        <input
                          type="text"
                          value={cf.name}
                          onChange={(e) => updateCoFounder(i, 'name', e.target.value)}
                          placeholder="Jane Smith"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                        <input
                          type="text"
                          value={cf.title}
                          onChange={(e) => updateCoFounder(i, 'title', e.target.value)}
                          placeholder="CTO"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                        <input
                          type="email"
                          value={cf.email}
                          onChange={(e) => updateCoFounder(i, 'email', e.target.value)}
                          placeholder="jane@company.com"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn</label>
                        <input
                          type="url"
                          value={cf.linkedin}
                          onChange={(e) => updateCoFounder(i, 'linkedin', e.target.value)}
                          placeholder="linkedin.com/in/..."
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('company')}
                className="flex-1 py-3 rounded-lg font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                Back
              </button>
              <button onClick={handleSaveFounder} disabled={!isFounderValid || authLoading}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                  isFounderValid ? 'bg-kunfa hover:bg-kunfa-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}>
                {authLoading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Upload & Score */}
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
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Financials & Metrics</label>
              <UploadZone
                label="Tap to upload"
                subtitle="Financials, data room — up to 50 MB (optional)"
                required={false}
                accept=".pdf,.xlsx,.xls,.csv"
                file={financials}
                onFileSelect={setFinancials}
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              {[
                { label: 'Pitch deck', done: !!pitchDeck },
                { label: 'Financials', done: !!financials, optional: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    item.done ? 'bg-kunfa' : 'bg-gray-200'
                  }`}>
                    {item.done && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs ${item.done ? 'text-kunfa-navy font-medium' : 'text-gray-400'}`}>
                    {item.label}{item.optional ? ' (optional)' : ''}
                  </span>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={disclaimerChecked}
                onChange={(e) => setDisclaimerChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-kunfa focus:ring-kunfa"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                I confirm that all information provided is accurate and self-reported. I agree to the{' '}
                <a href="/terms" target="_blank" className="text-kunfa hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" className="text-kunfa hover:underline">Privacy Policy</a>.
                This data is subject to due diligence by any interested investor.
              </span>
            </label>

            <button onClick={handleSubmit} disabled={!isUploadValid || isSubmitting}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                isUploadValid
                  ? 'bg-kunfa hover:bg-kunfa-dark text-white cursor-pointer'
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
