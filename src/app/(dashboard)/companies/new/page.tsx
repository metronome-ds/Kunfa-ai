'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { FileUp, PenLine } from 'lucide-react'
import { STAGES, INDUSTRIES } from '@/lib/constants'
import { createBrowserClient } from '@supabase/ssr'

type Tab = 'pdf' | 'manual'
type Status = 'idle' | 'extracting' | 'submitting' | 'scoring' | 'done'

export default function AddCompanyPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pdf')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')

  const [form, setForm] = useState({
    company_name: '',
    sector: '',
    stage: '',
    raise_amount: '',
    description: '',
    team_size: '',
    founded_year: '',
  })

  // Get current user email for scoring
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handlePdfUpload(file: File) {
    setPdfFile(file)
    setStatus('extracting')
    setError('')

    try {
      // Upload to Vercel Blob
      const blob = await upload(`companies/${Date.now()}/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      setBlobUrl(blob.url)

      // Extract details via AI
      const res = await fetch('/api/companies/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: blob.url }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to extract')
      }

      const extracted = await res.json()
      setForm({
        company_name: extracted.company_name || '',
        sector: extracted.sector || '',
        stage: extracted.stage || '',
        raise_amount: extracted.raise_amount ? String(extracted.raise_amount) : '',
        description: extracted.description || '',
        team_size: extracted.team_size ? String(extracted.team_size) : '',
        founded_year: extracted.founded_year ? String(extracted.founded_year) : '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract PDF data')
    } finally {
      setStatus('idle')
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
      // 1. Create company + deal
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
          pdf_url: blobUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create company')
      }

      const { companyPageId, slug } = await res.json()

      // 2. If we have a PDF, trigger AI scoring
      if (blobUrl && pdfFile && userEmail) {
        setStatus('scoring')

        const scoreRes = await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            pitchDeckUrl: blobUrl,
            pitchDeckFilename: pdfFile.name,
            companyPageId,
          }),
        })

        if (!scoreRes.ok) {
          // Scoring failed — still redirect, company was created
          console.error('Scoring failed:', await scoreRes.text())
        }
      }

      // 3. Redirect to company profile
      router.push(`/company/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('idle')
    }
  }

  const isProcessing = status === 'extracting' || status === 'submitting' || status === 'scoring'

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Company</h1>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('pdf')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'pdf'
              ? 'bg-[#0168FE] text-white'
              : 'bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-200'
          }`}
        >
          <FileUp className="w-4 h-4" />
          Upload PDF
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'manual'
              ? 'bg-[#0168FE] text-white'
              : 'bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-200'
          }`}
        >
          <PenLine className="w-4 h-4" />
          Add Manually
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Scoring Progress */}
      {status === 'scoring' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-center">
          <div className="w-10 h-10 border-3 border-[#0168FE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">AI is scoring this company...</p>
          <p className="text-xs text-gray-500 mt-1">Analyzing pitch deck and generating insights</p>
        </div>
      )}

      {/* PDF Upload Tab */}
      {tab === 'pdf' && !form.company_name && status !== 'scoring' && (
        <div className="mb-6">
          <label
            htmlFor="pdf-upload"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#0168FE] transition cursor-pointer bg-gray-50"
          >
            {status === 'extracting' ? (
              <>
                <div className="w-8 h-8 border-2 border-[#0168FE] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-gray-600">Extracting details from PDF...</p>
              </>
            ) : (
              <>
                <FileUp className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 font-medium">
                  {pdfFile ? pdfFile.name : 'Drop a pitch deck PDF here or click to upload'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF up to 50MB</p>
              </>
            )}
          </label>
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handlePdfUpload(file)
            }}
          />
        </div>
      )}

      {/* Form (shown in manual tab or after PDF extraction) */}
      {(tab === 'manual' || form.company_name) && status !== 'scoring' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'pdf' && form.company_name && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
              <p className="text-sm text-[#0168FE]">
                Fields extracted from PDF. Review and edit as needed.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
              placeholder="Acme Corp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select
                value={form.sector}
                onChange={(e) => updateField('sector', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => updateField('stage', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
              >
                <option value="">Select stage</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raise Amount (USD)</label>
              <input
                type="number"
                value={form.raise_amount}
                onChange={(e) => updateField('raise_amount', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
                placeholder="e.g. 2000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
              <input
                type="number"
                value={form.team_size}
                onChange={(e) => updateField('team_size', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
                placeholder="e.g. 12"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
            <input
              type="number"
              value={form.founded_year}
              onChange={(e) => updateField('founded_year', e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
              placeholder="e.g. 2023"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE] resize-none"
              placeholder="Brief company description..."
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing || !form.company_name}
            className="w-full py-3 bg-[#0168FE] text-white rounded-lg font-semibold hover:bg-[#0050CC] transition disabled:opacity-50"
          >
            {status === 'submitting'
              ? 'Creating...'
              : blobUrl
                ? 'Add & Score Company'
                : 'Add to Pipeline'}
          </button>
        </form>
      )}
    </div>
  )
}
