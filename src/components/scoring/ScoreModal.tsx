'use client'

import { useState, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import Modal from '@/components/ui/Modal'
import UploadZone from './UploadZone'
import VoiceRecorder from './VoiceRecorder'
import ProcessingAnimation from './ProcessingAnimation'
import TeaserScore from './TeaserScore'

interface ScoreModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'upload' | 'processing' | 'results'

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

/**
 * Upload a single file directly to Vercel Blob from the browser.
 * Returns the public blob URL.
 */
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
  const [step, setStep] = useState<Step>('upload')
  const [email, setEmail] = useState('')
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
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'new' | 'existing' | 'has_submission'>('idle')

  const isFormValid = email && pitchDeck && financials && linkedinUrl && emailStatus !== 'has_submission'

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || isSubmitting || !pitchDeck || !financials) return
    setError('')
    setIsSubmitting(true)
    setStep('processing')

    try {
      // --- Step 1: upload files client-side directly to Vercel Blob ---
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

      // --- Step 2: send only URLs + metadata to /api/score (tiny JSON payload) ---
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
  }, [email, pitchDeck, financials, linkedinUrl, voiceNote, isFormValid, isSubmitting])

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
    setStep('upload')
    setEmail('')
    setPitchDeck(null)
    setFinancials(null)
    setLinkedinUrl('')
    setVoiceNote(null)
    setScoreResult(null)
    setSubmissionId('')
    setSlug('')
    setError('')
    setUploadProgress('')
    setEmailStatus('idle')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-kunfa-navy">Get Your Kunfa Score</h2>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { key: 'upload', label: 'Upload' },
            { key: 'processing', label: 'Processing' },
            { key: 'results', label: 'Results' },
          ].map((s, i) => {
            const stepOrder = ['upload', 'processing', 'results']
            const currentIdx = stepOrder.indexOf(step)
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
                  <span className={`text-xs font-medium ${isActive ? 'text-kunfa-navy' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step Content */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailStatus('idle')
                }}
                onBlur={async () => {
                  if (!email || !email.includes('@')) return
                  setEmailStatus('checking')
                  try {
                    const res = await fetch('/api/auth/check-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    })
                    const data = await res.json()
                    if (data.hasSubmission) {
                      setEmailStatus('has_submission')
                    } else if (data.exists) {
                      setEmailStatus('existing')
                    } else {
                      setEmailStatus('new')
                    }
                  } catch {
                    setEmailStatus('new')
                  }
                }}
                placeholder="founder@company.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent"
              />
              {emailStatus === 'checking' && (
                <p className="text-xs text-gray-400 mt-1">Checking email...</p>
              )}
              {emailStatus === 'new' && (
                <p className="text-xs text-emerald-600 mt-1">We&apos;ll create your free Kunfa account with this email.</p>
              )}
              {emailStatus === 'existing' && (
                <p className="text-xs text-blue-600 mt-1">Welcome back! This score will be linked to your account.</p>
              )}
              {emailStatus === 'has_submission' && (
                <p className="text-xs text-red-600 mt-1">This email already has a submission. Each account is limited to one. Use a different email to score another business.</p>
              )}
            </div>

            {/* Pitch Deck */}
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

            {/* Financials */}
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

            {/* LinkedIn */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">
                LinkedIn Profile URL
                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">REQUIRED</span>
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kunfa-green focus:border-transparent"
              />
            </div>

            {/* Voice Note */}
            <div>
              <label className="block text-sm font-medium text-kunfa-navy mb-1.5">Voice Note</label>
              <VoiceRecorder recording={voiceNote} onRecordingComplete={setVoiceNote} />
            </div>

            {/* Completion indicators */}
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

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                isFormValid
                  ? 'bg-kunfa-green hover:bg-kunfa-green-dark text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
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
