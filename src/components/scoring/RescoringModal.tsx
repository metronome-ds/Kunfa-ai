'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import ProcessingAnimation from './ProcessingAnimation'
import UploadErrorBanner from '@/components/common/UploadErrorBanner'
import { FileText, Upload, CheckSquare, Square, Plus } from 'lucide-react'

const RESCORE_MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const RESCORE_ACCEPTED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.key', '.xlsx', '.xls', '.csv', '.doc', '.docx'] as const
const RESCORE_ACCEPT_ATTR = RESCORE_ACCEPTED_EXTENSIONS.join(',')

type RescoreErrorKind = 'size' | 'type' | 'network' | 'scoring_too_large' | 'generic'
interface RescoreError {
  kind: RescoreErrorKind
  message: string
}

function validateRescoreFile(file: File): RescoreError | null {
  const name = file.name.toLowerCase()
  const extOk = RESCORE_ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
  if (!extOk) {
    return {
      kind: 'type',
      message: 'Please upload a PDF, PowerPoint, Word, Excel, or CSV file. Other file types are not supported.',
    }
  }
  if (file.size > RESCORE_MAX_FILE_SIZE) {
    return {
      kind: 'size',
      message: 'This file is too large. Maximum size is 25MB. Try compressing your PDF or reducing the number of pages.',
    }
  }
  return null
}

interface RescoringModalProps {
  isOpen: boolean
  onClose: () => void
  companyPageId: string
  companyName: string
  currentScore: number | null
  email: string
}

interface DealRoomDoc {
  id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  category: string
  is_public: boolean
  created_at: string
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

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    pitch_deck: 'Pitch Deck',
    financials: 'Financials',
    cap_table: 'Cap Table',
    legal: 'Legal',
    term_sheet: 'Term Sheet',
    due_diligence: 'Due Diligence',
    product: 'Product',
    other: 'Other',
  }
  return labels[category] || category
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    pitch_deck: 'bg-blue-100 text-blue-700',
    financials: 'bg-emerald-100 text-emerald-700',
    cap_table: 'bg-purple-100 text-purple-700',
    legal: 'bg-amber-100 text-amber-700',
    term_sheet: 'bg-rose-100 text-rose-700',
    due_diligence: 'bg-cyan-100 text-cyan-700',
    product: 'bg-indigo-100 text-indigo-700',
    other: 'bg-gray-100 text-gray-700',
  }
  return colors[category] || colors.other
}

const UPLOAD_CATEGORIES = [
  { value: 'pitch_deck', label: 'Pitch Deck' },
  { value: 'financials', label: 'Financials' },
  { value: 'cap_table', label: 'Cap Table' },
  { value: 'legal', label: 'Legal' },
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'due_diligence', label: 'Due Diligence' },
  { value: 'product', label: 'Product' },
  { value: 'other', label: 'Other' },
]

export default function RescoringModal({
  isOpen,
  onClose,
  companyPageId,
  companyName,
  currentScore,
  email,
}: RescoringModalProps) {
  const [step, setStep] = useState<'select' | 'processing' | 'results'>('select')
  const [documents, setDocuments] = useState<DealRoomDoc[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [submissionId, setSubmissionId] = useState('')
  const [rescoreError, setRescoreError] = useState<RescoreError | null>(null)
  const [uploadProgress, setUploadProgress] = useState('')

  // Inline upload state
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('other')
  const [uploading, setUploading] = useState(false)

  // Fetch deal room documents
  useEffect(() => {
    if (!isOpen) return
    setLoadingDocs(true)
    fetch(`/api/dealroom/${companyPageId}`)
      .then(res => res.json())
      .then(data => {
        const docs = (data.documents || []) as DealRoomDoc[]
        setDocuments(docs)
        // Auto-select all documents by default
        setSelectedIds(new Set(docs.map(d => d.id)))
      })
      .catch(() => setDocuments([]))
      .finally(() => setLoadingDocs(false))
  }, [isOpen, companyPageId])

  const toggleDoc = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(documents.map(d => d.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const hasPitchDeck = documents.some(d => selectedIds.has(d.id) && d.category === 'pitch_deck')

  const handleFilePicked = (f: File) => {
    const validationErr = validateRescoreFile(f)
    if (validationErr) {
      setRescoreError(validationErr)
      return
    }
    setRescoreError(null)
    setUploadFile(f)
  }

  const handleUploadDoc = async () => {
    if (!uploadFile) return

    // Re-validate before upload
    const validationErr = validateRescoreFile(uploadFile)
    if (validationErr) {
      setRescoreError(validationErr)
      return
    }

    setUploading(true)
    setRescoreError(null)

    try {
      const timestamp = Date.now()
      const filePath = `dealroom/${companyPageId}/${timestamp}/${uploadFile.name}`

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadFile, { cacheControl: '3600', upsert: false })

      if (uploadErr) {
        setRescoreError({
          kind: 'network',
          message: 'Upload failed. Please check your connection and try again.',
        })
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path)

      let res: Response
      try {
        res = await fetch(`/api/dealroom/${companyPageId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: publicUrl,
            fileName: uploadFile.name,
            fileSize: uploadFile.size,
            fileType: uploadFile.type || 'application/octet-stream',
            category: uploadCategory,
          }),
        })
      } catch {
        setRescoreError({
          kind: 'network',
          message: 'Upload failed. Please check your connection and try again.',
        })
        return
      }

      if (!res.ok) {
        setRescoreError({
          kind: 'generic',
          message: 'Failed to save document. Please try again.',
        })
        return
      }

      const newDoc = await res.json()
      const doc: DealRoomDoc = newDoc.document || {
        id: newDoc.id,
        file_name: uploadFile.name,
        file_url: publicUrl,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
        category: uploadCategory,
        is_public: false,
        created_at: new Date().toISOString(),
      }

      setDocuments(prev => [...prev, doc])
      setSelectedIds(prev => new Set([...prev, doc.id]))
      setUploadFile(null)
      setUploadCategory('other')
      setShowUpload(false)
    } catch {
      setRescoreError({
        kind: 'network',
        message: 'Upload failed. Please check your connection and try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (selectedIds.size === 0 || isSubmitting) return
    setRescoreError(null)
    setIsSubmitting(true)
    setStep('processing')

    try {
      let response: Response
      try {
        response = await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            pitchDeckUrl: 'deal-room-rescore', // placeholder — documents fetched server-side
            pitchDeckFilename: 'deal-room-rescore',
            companyPageId,
            documentIds: Array.from(selectedIds),
          }),
        })
      } catch {
        setRescoreError({
          kind: 'network',
          message: 'Upload failed. Please check your connection and try again.',
        })
        setStep('select')
        return
      }

      let data: { error?: string; teaser?: ScoreResult; submissionId?: string } = {}
      try {
        data = await response.json()
      } catch {
        setRescoreError({
          kind: 'network',
          message: 'Upload failed. Please check your connection and try again.',
        })
        setStep('select')
        return
      }

      if (!response.ok) {
        if (response.status === 413) {
          setRescoreError({
            kind: 'scoring_too_large',
            message:
              'Your document was uploaded successfully but is too large for AI analysis. Please upload a deck under 50 pages for scoring. You can still share this document in your deal room.',
          })
        } else {
          setRescoreError({
            kind: 'generic',
            message: data.error || `Something went wrong (${response.status}). Please try again.`,
          })
        }
        setStep('select')
        return
      }

      setScoreResult(data.teaser ?? null)
      setSubmissionId(data.submissionId ?? '')
    } catch (err) {
      setRescoreError({
        kind: 'generic',
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      })
      setStep('select')
    } finally {
      setIsSubmitting(false)
      setUploadProgress('')
    }
  }, [email, companyPageId, selectedIds, isSubmitting])

  const handleProcessingComplete = useCallback(() => {
    if (scoreResult) setStep('results')
  }, [scoreResult])

  const handleClose = () => {
    if (step === 'results') {
      window.location.reload()
      return
    }
    setStep('select')
    setSelectedIds(new Set())
    setScoreResult(null)
    setSubmissionId('')
    setRescoreError(null)
    setUploadProgress('')
    setShowUpload(false)
    setUploadFile(null)
    onClose()
  }

  const scoreDiff = scoreResult && currentScore != null
    ? scoreResult.overall_score - currentScore
    : null

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-kunfa-navy">Update Your Score</h2>
          <p className="text-sm text-gray-500 mt-1">{companyName}</p>
        </div>

        {rescoreError && (
          <div className="mb-4">
            <UploadErrorBanner
              variant={rescoreError.kind === 'scoring_too_large' ? 'warning' : 'error'}
              title={
                rescoreError.kind === 'scoring_too_large'
                  ? 'Upload succeeded — AI scoring unavailable'
                  : undefined
              }
              message={rescoreError.message}
              onDismiss={() => setRescoreError(null)}
              onRetry={
                rescoreError.kind === 'network'
                  ? () => {
                      setRescoreError(null)
                      handleSubmit()
                    }
                  : undefined
              }
            />
          </div>
        )}

        {/* Document Selection Step */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select the documents to include in your new score. A pitch deck is required for scoring.
            </p>

            {loadingDocs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0168FE]" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No documents in your deal room yet.</p>
                <p className="text-xs text-gray-400 mt-1">Upload documents below to get started.</p>
              </div>
            ) : (
              <>
                {/* Select All / Deselect All */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {selectedIds.size} of {documents.length} selected
                  </span>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs text-[#0168FE] hover:underline">
                      Select All
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <button onClick={deselectAll} className="text-xs text-gray-500 hover:underline">
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Document List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {documents.map(doc => {
                    const checked = selectedIds.has(doc.id)
                    return (
                      <button
                        key={doc.id}
                        onClick={() => toggleDoc(doc.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${
                          checked
                            ? 'border-[#0168FE] bg-blue-50/50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="w-5 h-5 text-[#0168FE] flex-shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(doc.category)}`}>
                            {getCategoryLabel(doc.category)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Add Document Inline */}
            {!showUpload ? (
              <button
                onClick={() => setShowUpload(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#0168FE] hover:text-[#0168FE] transition"
              >
                <Plus className="w-4 h-4" />
                Upload Additional Document
              </button>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = RESCORE_ACCEPT_ATTR
                    input.onchange = (ev) => {
                      const f = (ev.target as HTMLInputElement).files?.[0]
                      if (f) handleFilePicked(f)
                    }
                    input.click()
                  }}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
                    uploadFile ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-[#0168FE]'
                  }`}
                >
                  {uploadFile ? (
                    <p className="text-sm text-gray-900">{uploadFile.name}</p>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Click to select file · Max 25MB</p>
                    </>
                  )}
                </div>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                >
                  {UPLOAD_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowUpload(false); setUploadFile(null) }}
                    className="flex-1 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadDoc}
                    disabled={!uploadFile || uploading}
                    className="flex-1 py-2 rounded-lg text-sm bg-[#0168FE] text-white hover:bg-[#0050CC] transition disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Add'}
                  </button>
                </div>
              </div>
            )}

            {/* Warning if no pitch deck */}
            {!hasPitchDeck && selectedIds.size > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  No pitch deck selected. A pitch deck is required for scoring. Please select one or upload a new pitch deck.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || !hasPitchDeck || isSubmitting}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                selectedIds.size > 0 && hasPitchDeck
                  ? 'bg-kunfa hover:bg-kunfa-dark text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedIds.size === 0
                ? 'SELECT DOCUMENTS TO SCORE'
                : `RE-SCORE WITH ${selectedIds.size} DOCUMENT${selectedIds.size !== 1 ? 'S' : ''}`}
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

        {/* Results Step */}
        {step === 'results' && scoreResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-8">
              {currentScore != null && (
                <>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Previous</p>
                    <p className="text-4xl font-bold text-gray-400">{currentScore}</p>
                  </div>
                  <div className="text-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </>
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

            {scoreResult.summary && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">{scoreResult.summary}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.href = `/score/${submissionId}`}
                className="w-full py-3 rounded-lg font-semibold text-sm bg-kunfa hover:bg-kunfa-dark text-white transition"
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
