'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { STAGES, INDUSTRIES } from '@/lib/constants'

interface CompanyData {
  id: string
  company_name: string
  one_liner: string | null
  description: string | null
  industry: string | null
  stage: string | null
  country: string | null
  headquarters: string | null
  website_url: string | null
  linkedin_url: string | null
  raise_amount: number | string | null
  team_size: number | null
  founded_year: number | null
  founder_name: string | null
  founder_title: string | null
}

interface EditCompanyModalProps {
  company: CompanyData
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export default function EditCompanyModal({ company, isOpen, onClose, onSaved }: EditCompanyModalProps) {
  const [form, setForm] = useState({
    company_name: company.company_name || '',
    one_liner: company.one_liner || '',
    description: company.description || '',
    industry: company.industry || '',
    stage: company.stage || '',
    country: company.country || company.headquarters || '',
    website_url: company.website_url || '',
    linkedin_url: company.linkedin_url || '',
    raise_amount: company.raise_amount ? String(company.raise_amount) : '',
    team_size: company.team_size ? String(company.team_size) : '',
    founded_year: company.founded_year ? String(company.founded_year) : '',
    founder_name: company.founder_name || '',
    founder_title: company.founder_title || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSuccess(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) {
      setError('Company name is required')
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name,
          one_liner: form.one_liner || null,
          description: form.description || null,
          industry: form.industry || null,
          stage: form.stage || null,
          country: form.country || null,
          headquarters: form.country || null,
          website_url: form.website_url || null,
          linkedin_url: form.linkedin_url || null,
          raise_amount: form.raise_amount ? Number(form.raise_amount) : null,
          team_size: form.team_size ? Number(form.team_size) : null,
          founded_year: form.founded_year ? Number(form.founded_year) : null,
          founder_name: form.founder_name || null,
          founder_title: form.founder_title || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSuccess(true)
      setTimeout(() => {
        onSaved()
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-lg font-bold text-gray-900">Edit Company</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-700">Company updated successfully!</p>
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className={labelClass}>Company Name *</label>
            <input
              type="text"
              value={form.company_name}
              onChange={e => updateField('company_name', e.target.value)}
              required
              className={inputClass}
              placeholder="Acme Corp"
            />
          </div>

          {/* One-liner */}
          <div>
            <label className={labelClass}>One-Liner / Tagline</label>
            <input
              type="text"
              value={form.one_liner}
              onChange={e => updateField('one_liner', e.target.value)}
              className={inputClass}
              placeholder="AI-powered analytics for enterprises"
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Brief company description..."
            />
          </div>

          {/* Industry + Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Industry</label>
              <select
                value={form.industry}
                onChange={e => updateField('industry', e.target.value)}
                className={inputClass}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Stage</label>
              <select
                value={form.stage}
                onChange={e => updateField('stage', e.target.value)}
                className={inputClass}
              >
                <option value="">Select stage</option>
                {STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Country + Website */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Country / HQ</label>
              <input
                type="text"
                value={form.country}
                onChange={e => updateField('country', e.target.value)}
                className={inputClass}
                placeholder="e.g. Saudi Arabia"
              />
            </div>
            <div>
              <label className={labelClass}>Website URL</label>
              <input
                type="text"
                value={form.website_url}
                onChange={e => updateField('website_url', e.target.value)}
                className={inputClass}
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className={labelClass}>LinkedIn URL</label>
            <input
              type="text"
              value={form.linkedin_url}
              onChange={e => updateField('linkedin_url', e.target.value)}
              className={inputClass}
              placeholder="https://linkedin.com/company/..."
            />
          </div>

          {/* Raise Amount + Team Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Raise Amount (USD)</label>
              <input
                type="number"
                value={form.raise_amount}
                onChange={e => updateField('raise_amount', e.target.value)}
                className={inputClass}
                placeholder="e.g. 2000000"
              />
            </div>
            <div>
              <label className={labelClass}>Team Size</label>
              <input
                type="number"
                value={form.team_size}
                onChange={e => updateField('team_size', e.target.value)}
                className={inputClass}
                placeholder="e.g. 12"
              />
            </div>
          </div>

          {/* Founded Year */}
          <div>
            <label className={labelClass}>Founded Year</label>
            <input
              type="number"
              value={form.founded_year}
              onChange={e => updateField('founded_year', e.target.value)}
              className={inputClass}
              placeholder="e.g. 2023"
            />
          </div>

          {/* Founder Name + Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Founder Name</label>
              <input
                type="text"
                value={form.founder_name}
                onChange={e => updateField('founder_name', e.target.value)}
                className={inputClass}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className={labelClass}>Founder Title</label>
              <input
                type="text"
                value={form.founder_title}
                onChange={e => updateField('founder_title', e.target.value)}
                className={inputClass}
                placeholder="CEO & Co-Founder"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#0168FE] text-white rounded-lg font-semibold text-sm hover:bg-[#0050CC] transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
