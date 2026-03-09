'use client'

import { useState, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import Modal from '@/components/ui/Modal'
import UploadZone from './UploadZone'
import ProcessingAnimation from './ProcessingAnimation'

interface RescoringModalProps {
  isOpen: boolean
  onClose: () => void
  companyPageId: string
  companyName: string
  currentScore: number | null
  email: string
}

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

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function getScoreDiffColor(diff: number) {
  if (diff > 0) return 'text-emerald-400'
  if (diff < 0) return 'text-red-400'
  return 'text-gray-400'
}

async function uploadToBlob(file: File | Blob, pathname: string): Promise<string> {
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  })
  return blob.url
}

export default function RescoringModal({
  isOpen,
  onClose,
  companyPageId,
  companyName,
  currentScore,
  email,
}: RescoringModalProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'results'>('upload')
  const [disclaimerChecked, setDisclaimerChecked] = useState(false)
  const [pitchDeck, setPitchDeck] = useState<File | null>(null)
  const [financials, setFinancials] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [submissionId, setSubmissionId] = useState('')
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  const isUploadValid = !!pitchDeck && disclaimerChecked

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
        pitchDeckUrl = await uploadToBlob(
          pitchDeck,
          `submissions/${timestamp}/rescore-pitch-deck-${pitchDeck.name}`,
        )
        if (financials) {
          setUploadProgress('Uploading financials...')
          financialsUrl = await uploadToBlob(
            financials,
            `submissions/${timestamp}/rescore-financials-${financials.name}`,
          )
          financialsFilename = financials.name
        }
      } catch (uploadErr) {
        throw new Error(
          `File upload failed: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}.`,
        )
      }

      setUploadProgress('')

      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          pitchDeckUrl,
          pitchDeckFilename: pitchDeck.name,
          financialsUrl,
          financialsFilename,
          companyPageId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status})`)
      }

      setScoreResult(data.teaser)
      setSubmissionId(data.submissionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('upload')
    } finally {
      setIsSubmitting(false)
      setUploadProgress('')
    }
  }, [email, pitchDeck, financials, companyPageId, isUploadValid, isSubmitting])

  const handleProcessingComplete = useCallback(() => {
    if (scoreResult) {
      setStep('results')
    }
  }, [scoreResult])

  const handleClose = () => {
    if (step === 'results') {
      // Reload the page to show updated score
      window.location.reload()
      return
    }
    setStep('upload')
    setDisclaimerChecked(false)
    setPitchDeck(null)
    setFinancials(null)
    setScoreResult(null)
    setSubmissionId('')
    setError('')
    setUploadProgress('')
    onClose()
  }

  const scoreDiff = scoreResult && currentScore != null
    ? scoreResult.overall_score - currentScore
    : null

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6 sm:p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-kunfa-navy">Update Your Score</h2>
          <p className="text-sm text-gray-500 mt-1">{companyName}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload your latest pitch deck to get a new score. Your company profile will be updated with the new results.
            </p>

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

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={disclaimerChecked}
                onChange={(e) => setDisclaimerChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-kunfa-green focus:ring-kunfa-green"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                I confirm that all information provided is accurate and self-reported. I agree to the{' '}
                <a href="/terms" target="_blank" className="text-kunfa-green hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" className="text-kunfa-green hover:underline">Privacy Policy</a>.
                This data is subject to due diligence by any interested investor.
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={!isUploadValid || isSubmitting}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                isUploadValid
                  ? 'bg-kunfa-green hover:bg-kunfa-green-dark text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              RE-SCORE MY STARTUP
            </button>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div>
            {uploadProgress && (
              <p className="text-center text-sm text-kunfa-text-secondary mb-4">{uploadProgress}</p>
            )}
            <ProcessingAnimation onComplete={handleProcessingComplete} />
          </div>
        )}

        {/* Results Step — Score Comparison */}
        {step === 'results' && scoreResult && (
          <div className="space-y-6">
            {/* Score Comparison */}
            <div className="flex items-center justify-center gap-8">
              {currentScore != null && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Previous</p>
                  <p className="text-4xl font-bold text-gray-400">{currentScore}</p>
                </div>
              )}
              {currentScore != null && (
                <div className="text-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              )}
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">New Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(scoreResult.overall_score)}`}>
                  {scoreResult.overall_score}
                </p>
                {scoreDiff !== null && scoreDiff !== 0 && (
                  <p className={`text-sm font-semibold mt-1 ${getScoreDiffColor(scoreDiff)}`}>
                    {scoreDiff > 0 ? '+' : ''}{scoreDiff} points
                  </p>
                )}
              </div>
            </div>

            {/* Category Grades */}
            <div className="grid grid-cols-2 gap-3">
              {(['team', 'market', 'product', 'financial'] as const).map((key) => {
                const dim = scoreResult.dimensions[key]
                const labels: Record<string, string> = {
                  team: 'Team & Founders',
                  market: 'Market Opportunity',
                  product: 'Product & Tech',
                  financial: 'Financial Health',
                }
                return (
                  <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{labels[key]}</span>
                      <span className="text-xs font-bold text-gray-900">{dim.letter_grade}</span>
                    </div>
                    {dim.headline && (
                      <p className="text-[10px] text-gray-500">{dim.headline}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            {scoreResult.summary && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">{scoreResult.summary}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.href = `/score/${submissionId}`}
                className="w-full py-3 rounded-lg font-semibold text-sm bg-kunfa-green hover:bg-kunfa-green-dark text-white transition"
              >
                View Full Score Details
              </button>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-lg font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
