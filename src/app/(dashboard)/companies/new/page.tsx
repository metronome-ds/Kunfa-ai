'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { FileUp, PenLine } from 'lucide-react'

type Tab = 'pdf' | 'manual'

export default function AddCompanyPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pdf')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    company_name: '',
    sector: '',
    stage: '',
    raise_amount: '',
    description: '',
    team_size: '',
    founded_year: '',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handlePdfUpload(file: File) {
    setPdfFile(file)
    setExtracting(true)
    setError('')

    try {
      // Upload to Vercel Blob
      const blob = await upload(`companies/${Date.now()}/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })

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
      setExtracting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name) {
      setError('Company name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
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
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create company')
      }

      router.push('/pipeline')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Company</h1>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('pdf')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'pdf'
              ? 'bg-blue-600 text-white'
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
              ? 'bg-blue-600 text-white'
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

      {/* PDF Upload Tab */}
      {tab === 'pdf' && !form.company_name && (
        <div className="mb-6">
          <label
            htmlFor="pdf-upload"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition cursor-pointer bg-gray-50"
          >
            {extracting ? (
              <>
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
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
      {(tab === 'manual' || form.company_name) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'pdf' && form.company_name && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
              <p className="text-sm text-blue-700">Fields extracted from PDF. Review and edit as needed.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Corp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select
                value={form.sector}
                onChange={(e) => updateField('sector', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select industry</option>
                <option value="FinTech">FinTech</option>
                <option value="HealthTech">HealthTech</option>
                <option value="EdTech">EdTech</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="SaaS">SaaS</option>
                <option value="AI / ML">AI / ML</option>
                <option value="CleanTech">CleanTech</option>
                <option value="AgriTech">AgriTech</option>
                <option value="PropTech">PropTech</option>
                <option value="InsurTech">InsurTech</option>
                <option value="Logistics">Logistics</option>
                <option value="Media & Entertainment">Media & Entertainment</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Biotech">Biotech</option>
                <option value="Gaming">Gaming</option>
                <option value="Social Impact">Social Impact</option>
                <option value="Mobility">Mobility</option>
                <option value="FoodTech">FoodTech</option>
                <option value="LegalTech">LegalTech</option>
                <option value="HRTech">HRTech</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => updateField('stage', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select stage</option>
                <option value="Pre-seed">Pre-seed</option>
                <option value="Seed">Seed</option>
                <option value="Series A">Series A</option>
                <option value="Series B">Series B</option>
                <option value="Series C+">Series C+</option>
                <option value="Growth">Growth</option>
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
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 2000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
              <input
                type="number"
                value={form.team_size}
                onChange={(e) => updateField('team_size', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 2023"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief company description..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.company_name}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Add to Pipeline'}
          </button>
        </form>
      )}
    </div>
  )
}
