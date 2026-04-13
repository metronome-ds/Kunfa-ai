'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { FileSearch, Upload, CheckCircle2, AlertTriangle, Shield, ArrowRight, RotateCcw, Save, Briefcase } from 'lucide-react'
import Link from 'next/link'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc']

const PROCESSING_MESSAGES = [
  'Extracting text from your document...',
  'Identifying clauses and terms...',
  'Analyzing each clause for founder-friendliness...',
  'Comparing to market standards...',
  'Generating your analysis...',
]

interface Clause {
  name: string
  rating: 'founder_friendly' | 'standard' | 'needs_attention'
  extracted_text: string
  explanation: string
  market_comparison: string
}

interface Analysis {
  overall_rating: 'founder_friendly' | 'standard' | 'needs_attention'
  clauses: Clause[]
  summary: string
  stats: {
    total_clauses: number
    founder_friendly: number
    standard: number
    needs_attention: number
  }
}

interface AnalyzeResponse {
  analysis: Analysis
  fileName: string
  fileSize: number
  fileType: string
}

const RATING_CONFIG = {
  founder_friendly: {
    label: 'Founder-Friendly',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    icon: CheckCircle2,
  },
  standard: {
    label: 'Standard Terms',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700 border-amber-300',
    icon: Shield,
  },
  needs_attention: {
    label: 'Proceed with Caution',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700 border-red-300',
    icon: AlertTriangle,
  },
}

export default function TermSheetAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingMsg, setProcessingMsg] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get user's company ID for saving
  useEffect(() => {
    async function loadCompany() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('company_pages')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) setCompanyId(data.id)
    }
    loadCompany()
  }, [])

  // Rotate processing messages
  useEffect(() => {
    if (!processing) return
    const interval = setInterval(() => {
      setProcessingMsg(prev => (prev + 1) % PROCESSING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [processing])

  const validateFile = (f: File): string | null => {
    const name = f.name.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.some(ext => name.endsWith(ext))) {
      return 'Please upload a PDF or Word document (.pdf, .docx).'
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 25MB.'
    }
    return null
  }

  const handleFileSelect = (f: File) => {
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setFile(f)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setProcessing(true)
    setProcessingMsg(0)
    setError(null)

    try {
      // Upload to storage first (for later saving)
      const { data: { user } } = await supabase.auth.getUser()
      if (user && companyId) {
        const timestamp = Date.now()
        const filePath = `dealroom/${companyId}/${timestamp}/${file.name}`
        const { data: uploadData } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(uploadData.path)
          setFileUrl(publicUrl)
        }
      }

      // Send to analyze endpoint
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/term-sheet/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Analysis failed')
      }

      const data: AnalyzeResponse = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleSave = async () => {
    if (!result || !companyId) return
    setSaving(true)

    try {
      const res = await fetch('/api/term-sheet/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          fileName: result.fileName,
          fileUrl,
          fileSize: result.fileSize,
          fileType: result.fileType,
          analysis: result.analysis,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }

      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setSaved(false)
    setFileUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Processing State ---
  if (processing) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#007CF8]/10 flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 border-3 border-[#007CF8] border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Analyzing Your Term Sheet</h1>
        <p className="text-gray-500 animate-pulse">{PROCESSING_MESSAGES[processingMsg]}</p>
      </div>
    )
  }

  // --- Results State ---
  if (result) {
    const { analysis } = result
    const overallConfig = RATING_CONFIG[analysis.overall_rating] || RATING_CONFIG.standard
    const OverallIcon = overallConfig.icon

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Summary Card */}
        <div className={`rounded-xl border ${overallConfig.border} ${overallConfig.bg} p-6 mb-8`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${overallConfig.badge}`}>
              <OverallIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 mb-1">Term Sheet Analysis</h1>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${overallConfig.badge}`}>
                {overallConfig.label}
              </span>
              <p className="text-sm text-gray-600 mt-3">{analysis.summary}</p>
              {analysis.stats && (
                <p className="text-xs text-gray-500 mt-2">
                  {analysis.stats.total_clauses} clauses analyzed &middot;{' '}
                  {analysis.stats.founder_friendly} founder-friendly &middot;{' '}
                  {analysis.stats.needs_attention} need attention
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Clause Cards */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Clause-by-Clause Breakdown</h2>
          {analysis.clauses.map((clause, i) => {
            const config = RATING_CONFIG[clause.rating] || RATING_CONFIG.standard
            const ClauseIcon = config.icon
            return (
              <div key={i} className={`rounded-lg border ${config.border} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <ClauseIcon className={`w-4 h-4 ${config.text}`} />
                  <span className="font-semibold text-gray-900">{clause.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.badge}`}>
                    {config.label}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500 font-medium">What the term sheet says:</span>
                    <p className="text-gray-600 italic mt-0.5 pl-3 border-l-2 border-gray-200">{clause.extracted_text}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">What this means:</span>
                    <p className="text-gray-700 mt-0.5">{clause.explanation}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Market comparison:</span>
                    <p className="text-gray-600 mt-0.5">{clause.market_comparison}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {companyId && !saved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save to Private Docs'}
            </button>
          )}
          {saved && (
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              Saved to Private Docs
            </span>
          )}
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition"
          >
            <Briefcase className="w-4 h-4" />
            Get Legal Help
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Analyze Another
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    )
  }

  // --- Upload State ---
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[#007CF8]/10 flex items-center justify-center mx-auto mb-6">
          <FileSearch className="w-8 h-8 text-[#007CF8]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Term Sheet Analyzer</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Upload a term sheet and get an instant AI-powered clause-by-clause analysis with founder-friendliness ratings and market comparisons.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0])
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition cursor-pointer ${
          dragOver
            ? 'border-[#007CF8] bg-blue-50'
            : file
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-gray-300 hover:border-[#007CF8]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
          }}
          className="hidden"
        />
        {file ? (
          <div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-400 mt-1">
              {(file.size / (1024 * 1024)).toFixed(1)} MB &middot; Click to change
            </p>
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Drop your term sheet here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">PDF or DOCX &middot; Max 25MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!file}
        className="w-full mt-6 py-3 bg-[#007CF8] text-white rounded-lg text-sm font-semibold hover:bg-[#0066D6] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Analyze Term Sheet
      </button>

      <p className="text-xs text-gray-400 text-center mt-4">
        Your document is analyzed securely and never shared. Results can be saved to your Private Docs.
      </p>
    </div>
  )
}
