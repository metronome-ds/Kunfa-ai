'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, PenLine, Upload, X, Send, Mail, FileText, Loader2 } from 'lucide-react'
import { STAGES, INDUSTRIES } from '@/lib/constants'
import { createBrowserClient } from '@supabase/ssr'
import CompanyLogo from '@/components/common/CompanyLogo'

type Tab = 'pdf' | 'manual' | 'invite'
type Status = 'idle' | 'extracting' | 'uploading' | 'submitting' | 'scoring' | 'done'

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB per file
const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]
const ACCEPTED_DOC_EXT = '.pdf,.pptx,.docx,.xlsx,.csv'

interface UploadedDoc {
  file: File
  url: string | null
  uploading: boolean
  error: string | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default function AddCompanyPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pdf')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  // Multi-document state
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  const [primaryPdfUrl, setPrimaryPdfUrl] = useState<string | null>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    company_name: '',
    sector: '',
    stage: '',
    raise_amount: '',
    description: '',
    team_size: '',
    founded_year: '',
    website_url: '',
    company_linkedin_url: '',
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Invite tab state
  const [inviteForm, setInviteForm] = useState({
    companyName: '',
    founderEmail: '',
    founderName: '',
    message: '',
  })
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
      if (data.user) {
        const [profileRes, ctxRes] = await Promise.all([
          supabase.from('profiles').select('full_name, fund_name, role').eq('user_id', data.user.id).single(),
          fetch('/api/team-context').then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        if (profileRes.data?.role) setUserRole(profileRes.data.role)
        const entityName = ctxRes?.context?.fundName || ctxRes?.context?.teamOwnerName || null
        const investorLabel = entityName || profileRes.data?.fund_name || profileRes.data?.full_name || 'our team'
        setInviteForm(f => ({
          ...f,
          message: `The team at ${investorLabel} is excited to invite you to our private deal room. Simply upload your key documents and your profile will be auto-generated — no lengthy forms required. This is your first step in our due diligence process.\n\nWe're looking forward to partnering on this journey with you.`,
        }))
      }
    })
  }, [])

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleLogoUpload(file: File) {
    setLogoPreview(URL.createObjectURL(file))
    setLogoUploading(true)
    try {
      const supabase = getSupabaseBrowser()
      const path = `logos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { data, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(data.path)
      setLogoUrl(publicUrl)
    } catch (err) {
      console.error('Logo upload error:', err)
      setLogoPreview(null)
    } finally {
      setLogoUploading(false)
    }
  }

  // Upload a single document to Supabase Storage (browser-direct, no /api/upload)
  async function uploadDocToStorage(file: File): Promise<string> {
    const supabase = getSupabaseBrowser()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
    const path = `documents/${Date.now()}-${safeName}`
    const { data, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (uploadError) throw new Error(uploadError.message)
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path)
    return publicUrl
  }

  async function handleDocFiles(files: FileList | null) {
    if (!files) return
    setError('')

    const newDocs: UploadedDoc[] = []
    for (let i = 0; i < files.length && docs.length + newDocs.length < MAX_FILES; i++) {
      const file = files[i]
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds 10 MB limit`)
        continue
      }
      if (file.type && !ACCEPTED_DOC_TYPES.includes(file.type)) {
        setError(`${file.name}: unsupported type. Use PDF, PPTX, DOCX, XLSX, or CSV.`)
        continue
      }
      newDocs.push({ file, url: null, uploading: true, error: null })
    }

    if (newDocs.length === 0) return

    const updatedDocs = [...docs, ...newDocs]
    setDocs(updatedDocs)

    // Upload each new doc in parallel
    const startIdx = docs.length
    const isFirstPdf = !primaryPdfUrl && !docs.some(d => d.file.type === 'application/pdf')

    for (let i = 0; i < newDocs.length; i++) {
      const idx = startIdx + i
      const doc = newDocs[i]

      try {
        const url = await uploadDocToStorage(doc.file)
        setDocs(prev => prev.map((d, j) => j === idx ? { ...d, url, uploading: false } : d))

        // First PDF triggers AI extraction
        if (isFirstPdf && i === 0 && doc.file.type === 'application/pdf') {
          setPrimaryPdfUrl(url)
          setStatus('extracting')
          try {
            const res = await fetch('/api/companies/extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pdfUrl: url }),
            })
            if (res.ok) {
              const extracted = await res.json()
              setForm({
                company_name: extracted.company_name || '',
                sector: extracted.sector || '',
                stage: extracted.stage || '',
                raise_amount: extracted.raise_amount ? String(extracted.raise_amount) : '',
                description: extracted.description || '',
                team_size: extracted.team_size ? String(extracted.team_size) : '',
                founded_year: extracted.founded_year ? String(extracted.founded_year) : '',
                website_url: extracted.website_url || '',
                company_linkedin_url: extracted.company_linkedin_url || '',
              })
            }
          } catch (err) {
            console.error('Extraction failed:', err)
          } finally {
            setStatus('idle')
          }
        }
      } catch (err) {
        setDocs(prev =>
          prev.map((d, j) =>
            j === idx
              ? { ...d, uploading: false, error: err instanceof Error ? err.message : 'Upload failed' }
              : d,
          ),
        )
      }
    }
  }

  function removeDoc(idx: number) {
    const removed = docs[idx]
    setDocs(prev => prev.filter((_, i) => i !== idx))
    // If we removed the primary PDF, clear extraction
    if (removed.url === primaryPdfUrl) {
      setPrimaryPdfUrl(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name) {
      setError('Company name is required')
      return
    }

    setStatus('submitting')
    setError('')

    try {
      const firstPdfUrl = docs.find(d => d.url && d.file.type === 'application/pdf')?.url || null

      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name,
          sector: form.sector || null,
          stage: form.stage || null,
          raise_amount: form.raise_amount ? Number(form.raise_amount) : null,
          description: form.description || null,
          team_size: form.team_size ? Number(form.team_size) : null,
          founded_year: form.founded_year ? Number(form.founded_year) : null,
          pdf_url: firstPdfUrl,
          website_url: form.website_url || null,
          company_linkedin_url: form.company_linkedin_url || null,
          logo_url: logoUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create company')
      }

      const { companyPageId, slug } = await res.json()

      // Store additional documents as dealroom_documents
      const additionalDocs = docs.filter(d => d.url && d.url !== firstPdfUrl)
      if (additionalDocs.length > 0 || firstPdfUrl) {
        const allDocsToStore = docs.filter(d => d.url)
        for (const doc of allDocsToStore) {
          try {
            await fetch('/api/dealroom/' + companyPageId, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_name: doc.file.name,
                file_url: doc.url,
                file_size: doc.file.size,
                file_type: doc.file.type || 'application/octet-stream',
                category: doc.file.type === 'application/pdf' ? 'pitch_deck' : 'other',
                is_public: true,
              }),
            })
          } catch (err) {
            console.error('Failed to create dealroom doc:', err)
          }
        }
      }

      // Investors: skip scoring, redirect immediately
      // Startups: auto-score if we have a PDF
      const isInvestor = userRole === 'investor' || userRole === 'vc' || userRole === 'angel'

      if (!isInvestor && firstPdfUrl && userEmail) {
        setStatus('scoring')
        try {
          await fetch('/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userEmail,
              pitchDeckUrl: firstPdfUrl,
              pitchDeckFilename: docs.find(d => d.url === firstPdfUrl)?.file.name || 'pitch.pdf',
              companyPageId,
            }),
          })
        } catch (err) {
          console.error('Scoring failed:', err)
        }
      }

      router.push(`/company/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('idle')
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteForm.companyName || !inviteForm.founderEmail) {
      setError('Company name and founder email are required')
      return
    }

    setInviteSending(true)
    setError('')
    setInviteSuccess('')

    try {
      const res = await fetch('/api/companies/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: inviteForm.companyName,
          founderEmail: inviteForm.founderEmail,
          founderName: inviteForm.founderName || undefined,
          message: inviteForm.message || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invite')
      }

      setInviteSuccess(`Invite sent to ${inviteForm.founderEmail}!`)
      setTimeout(() => router.push('/pipeline'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setInviteSending(false)
    }
  }

  const isProcessing = status === 'extracting' || status === 'uploading' || status === 'submitting' || status === 'scoring'
  const anyUploading = docs.some(d => d.uploading)

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Company</h1>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'pdf' as Tab, icon: <FileUp className="w-4 h-4" />, label: 'Upload Documents' },
          { key: 'manual' as Tab, icon: <PenLine className="w-4 h-4" />, label: 'Add Manually' },
          { key: 'invite' as Tab, icon: <Mail className="w-4 h-4" />, label: 'Invite Company' },
        ]).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === key
                ? 'bg-[#007CF8] text-white'
                : 'bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-200'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {status === 'scoring' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-center">
          <div className="w-10 h-10 border-3 border-[#007CF8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">AI is scoring this company...</p>
          <p className="text-xs text-gray-500 mt-1">Analyzing pitch deck and generating insights</p>
        </div>
      )}

      {/* Document Upload Tab */}
      {tab === 'pdf' && !form.company_name && status !== 'scoring' && (
        <div className="mb-6">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => !anyUploading && docInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') docInputRef.current?.click() }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleDocFiles(e.dataTransfer.files) }}
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition cursor-pointer bg-[#F8F9FB] ${
              status === 'extracting' ? 'border-[#007CF8]' : 'border-gray-300 hover:border-[#007CF8]'
            }`}
          >
            {status === 'extracting' ? (
              <>
                <div className="w-8 h-8 border-2 border-[#007CF8] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-gray-600">Extracting details from PDF...</p>
              </>
            ) : (
              <>
                <FileUp className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 font-medium">
                  Drop documents here or click to upload
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, PPTX, DOCX, XLSX — up to 10 MB each, max {MAX_FILES} files
                </p>
              </>
            )}
          </div>
          <input
            ref={docInputRef}
            type="file"
            accept={ACCEPTED_DOC_EXT}
            multiple
            className="hidden"
            onChange={(e) => handleDocFiles(e.target.files)}
          />

          {/* Uploaded files list */}
          {docs.length > 0 && (
            <div className="mt-3 space-y-2">
              {docs.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-200">
                  <FileText className={`w-5 h-5 flex-shrink-0 ${doc.error ? 'text-red-400' : doc.uploading ? 'text-gray-400' : 'text-emerald-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{doc.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(doc.file.size)}
                      {doc.uploading && ' · Uploading…'}
                      {doc.url && !doc.uploading && ' · Uploaded'}
                      {doc.error && ` · ${doc.error}`}
                    </p>
                  </div>
                  {doc.uploading && <Loader2 className="w-4 h-4 text-[#007CF8] animate-spin flex-shrink-0" />}
                  <button
                    type="button"
                    onClick={() => removeDoc(i)}
                    className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {docs.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="text-xs text-[#007CF8] font-medium hover:underline"
                >
                  + Add more files
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Invite Company Tab */}
      {tab === 'invite' && (
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {inviteSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-2">
              <p className="text-sm text-emerald-700">{inviteSuccess}</p>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-2">
            Send an email invite to a founder. They&apos;ll create their profile, upload their pitch deck, and get an AI score.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={inviteForm.companyName}
              onChange={(e) => setInviteForm(f => ({ ...f, companyName: e.target.value }))}
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Founder&apos;s Email *</label>
            <input
              type="email"
              value={inviteForm.founderEmail}
              onChange={(e) => setInviteForm(f => ({ ...f, founderEmail: e.target.value }))}
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
              placeholder="founder@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Founder&apos;s Name</label>
            <input
              type="text"
              value={inviteForm.founderName}
              onChange={(e) => setInviteForm(f => ({ ...f, founderName: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
              placeholder="Jane Smith (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={inviteForm.message}
              onChange={(e) => setInviteForm(f => ({ ...f, message: e.target.value }))}
              rows={5}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">This message will appear in the invite email.</p>
          </div>

          <button
            type="submit"
            disabled={inviteSending || !inviteForm.companyName || !inviteForm.founderEmail}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#007CF8] text-white rounded-lg font-semibold hover:bg-[#0066D6] transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {inviteSending ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      )}

      {/* Form (shown in manual tab or after PDF extraction) */}
      {(tab === 'manual' || (tab === 'pdf' && form.company_name)) && status !== 'scoring' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'pdf' && form.company_name && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
              <p className="text-sm text-[#007CF8]">
                Fields extracted from PDF. Review and edit as needed.
              </p>
            </div>
          )}

          {/* Uploaded docs summary (when form is visible) */}
          {docs.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {docs.map((doc, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                  <FileText className="w-3 h-3" />
                  {doc.file.name}
                  <button type="button" onClick={() => removeDoc(i)} className="ml-1 text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
              {docs.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-[#007CF8] hover:text-[#007CF8]"
                >
                  + Add file
                </button>
              )}
            </div>
          )}

          {/* Logo + Company Name row */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
              <div onClick={() => logoInputRef.current?.click()} className="cursor-pointer">
                {logoPreview ? (
                  <div className="relative group">
                    <CompanyLogo name={form.company_name || 'C'} logoUrl={logoPreview} size="lg" />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#007CF8] transition bg-[#F8F9FB]">
                    {logoUploading ? (
                      <Loader2 className="w-5 h-5 text-[#007CF8] animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleLogoUpload(file)
                }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => updateField('company_name', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                placeholder="Acme Corp"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input type="text" value={form.website_url} onChange={(e) => updateField('website_url', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" placeholder="https://example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company LinkedIn</label>
              <input type="text" value={form.company_linkedin_url} onChange={(e) => updateField('company_linkedin_url', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" placeholder="https://linkedin.com/company/..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select value={form.sector} onChange={(e) => updateField('sector', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]">
                <option value="">Select industry</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select value={form.stage} onChange={(e) => updateField('stage', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]">
                <option value="">Select stage</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raise Amount (USD)</label>
              <input type="number" value={form.raise_amount} onChange={(e) => updateField('raise_amount', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" placeholder="e.g. 2000000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
              <input type="number" value={form.team_size} onChange={(e) => updateField('team_size', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" placeholder="e.g. 12" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
            <input type="number" value={form.founded_year} onChange={(e) => updateField('founded_year', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" placeholder="e.g. 2023" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none" placeholder="Brief company description..." />
          </div>

          <button
            type="submit"
            disabled={isProcessing || anyUploading || !form.company_name}
            className="w-full py-3 bg-[#007CF8] text-white rounded-lg font-semibold hover:bg-[#0066D6] transition disabled:opacity-50"
          >
            {status === 'submitting' ? 'Creating...' : 'Add to Pipeline'}
          </button>
        </form>
      )}
    </div>
  )
}
