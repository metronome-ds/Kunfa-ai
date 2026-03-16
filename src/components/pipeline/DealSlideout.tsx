'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Star, FileText, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NotesTimeline from '@/components/pipeline/NotesTimeline'

interface DealData {
  id: string
  company_id: string
  stage: string
  company_name: string
  slug: string | null
  ai_score: number | null
  industry: string | null
  company_stage: string | null
  one_liner: string | null
  pdf_url: string | null
  notes: string | null
  priority_flag: boolean
  next_action: string | null
  next_action_date: string | null
  deal_size: number | null
  source: string | null
  thesis_fit: string | null
  contact_name: string | null
  contact_email: string | null
  assigned_to_name: string | null
  valuation_pre: number | null
  valuation_post: number | null
  lead_investor: string | null
  co_investors: string | null
  round_type: string | null
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  status: string
}

interface DealSlideoutProps {
  deal: DealData
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  teamMembers?: TeamMember[]
}

const DEAL_STAGES = [
  { value: 'sourced', label: 'Sourced' },
  { value: 'screening', label: 'Screening' },
  { value: 'due_diligence', label: 'Due Diligence' },
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'closed', label: 'Closed' },
]

const SOURCE_OPTIONS = ['Kunfa Platform', 'Referral', 'Conference', 'Cold Outreach', 'Other']

const ROUND_TYPES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'Bridge', 'Convertible Note']

function getScoreBadgeColor(score: number | null) {
  if (!score) return 'bg-gray-100 text-gray-500'
  if (score >= 80) return 'bg-emerald-100 text-emerald-700'
  if (score >= 60) return 'bg-blue-100 text-blue-700'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function formatNumber(val: string): string {
  const num = val.replace(/[^0-9]/g, '')
  if (!num) return ''
  return Number(num).toLocaleString()
}

export default function DealSlideout({ deal, isOpen, onClose, onUpdated, teamMembers = [] }: DealSlideoutProps) {
  const isWatchlistItem = deal.id.startsWith('temp-')

  const [form, setForm] = useState({
    stage: deal.stage,
    priority_flag: deal.priority_flag,
    assigned_to_name: deal.assigned_to_name || '',
    notes: deal.notes || '',
    next_action: deal.next_action || '',
    next_action_date: deal.next_action_date || '',
    deal_size: deal.deal_size ? String(deal.deal_size) : '',
    source: deal.source || '',
    thesis_fit: deal.thesis_fit || '',
    contact_name: deal.contact_name || '',
    contact_email: deal.contact_email || '',
    round_type: deal.round_type || '',
    valuation_pre: deal.valuation_pre ? String(deal.valuation_pre) : '',
    valuation_post: deal.valuation_post ? String(deal.valuation_post) : '',
    lead_investor: deal.lead_investor || '',
    co_investors: deal.co_investors || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [movingToPipeline, setMovingToPipeline] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Reset form when deal changes
  useEffect(() => {
    setForm({
      stage: deal.stage,
      priority_flag: deal.priority_flag,
      assigned_to_name: deal.assigned_to_name || '',
      notes: deal.notes || '',
      next_action: deal.next_action || '',
      next_action_date: deal.next_action_date || '',
      deal_size: deal.deal_size ? String(deal.deal_size) : '',
      source: deal.source || '',
      thesis_fit: deal.thesis_fit || '',
      contact_name: deal.contact_name || '',
      contact_email: deal.contact_email || '',
      round_type: deal.round_type || '',
      valuation_pre: deal.valuation_pre ? String(deal.valuation_pre) : '',
      valuation_post: deal.valuation_post ? String(deal.valuation_post) : '',
      lead_investor: deal.lead_investor || '',
      co_investors: deal.co_investors || '',
    })
    setSaved(false)
    setError('')
  }, [deal])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  if (!isOpen) return null

  async function handleMoveToPipeline() {
    setMovingToPipeline(true)
    setError('')
    try {
      const res = await fetch('/api/pipeline/move-to-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: deal.company_id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add to pipeline')
      }
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setMovingToPipeline(false)
    }
  }

  function updateField(field: string, value: unknown) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-calculate post-money if pre-money and deal_size are set
      if (field === 'valuation_pre' || field === 'deal_size') {
        const pre = Number((field === 'valuation_pre' ? value : next.valuation_pre)?.toString().replace(/,/g, '')) || 0
        const raise = Number((field === 'deal_size' ? value : next.deal_size)?.toString().replace(/,/g, '')) || 0
        if (pre > 0 && raise > 0) {
          next.valuation_post = String(pre + raise)
        }
      }
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const res = await fetch(`/api/pipeline/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: form.stage,
          priority_flag: form.priority_flag,
          assigned_to_name: form.assigned_to_name || null,
          notes: form.notes || null,
          next_action: form.next_action || null,
          next_action_date: form.next_action_date || null,
          deal_size: form.deal_size ? Number(form.deal_size.replace(/,/g, '')) : null,
          source: form.source || null,
          thesis_fit: form.thesis_fit || null,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          round_type: form.round_type || null,
          valuation_pre: form.valuation_pre ? Number(form.valuation_pre.replace(/,/g, '')) : null,
          valuation_post: form.valuation_post ? Number(form.valuation_post.replace(/,/g, '')) : null,
          lead_investor: form.lead_investor || null,
          co_investors: form.co_investors || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
      onUpdated()
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]'
  const labelClass = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Slideout Panel */}
      <div className="fixed top-0 right-0 h-full w-[450px] max-w-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-gray-900 truncate">{deal.company_name}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getScoreBadgeColor(deal.ai_score)}`}>
                {deal.ai_score ?? '—'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {deal.industry && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
                  {deal.industry}
                </span>
              )}
              {deal.company_stage && (
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium">
                  {deal.company_stage}
                </span>
              )}
            </div>

            {deal.one_liner && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{deal.one_liner}</p>
            )}

            {/* Links */}
            <div className="flex items-center gap-3 mt-3">
              {deal.slug && (
                <Link
                  href={`/company/${deal.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#0168FE] hover:underline"
                >
                  View Full Profile
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
              {deal.pdf_url && (
                <a
                  href={deal.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  <FileText className="w-3 h-3" />
                  View Pitch Deck
                </a>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition rounded-lg hover:bg-gray-100 -mr-1 -mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {isWatchlistItem ? (
            /* Watchlist item — read-only info + Move to Pipeline CTA */
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 font-medium mb-1">Watchlisted Company</p>
                <p className="text-xs text-amber-700">
                  This company is on your watchlist. Add it to your pipeline to start tracking deal progress, assign team members, and manage the investment process.
                </p>
              </div>

              {deal.one_liner && (
                <div>
                  <label className={labelClass}>About</label>
                  <p className="text-sm text-gray-700">{deal.one_liner}</p>
                </div>
              )}

              {(deal.industry || deal.company_stage) && (
                <div className="grid grid-cols-2 gap-3">
                  {deal.industry && (
                    <div>
                      <label className={labelClass}>Industry</label>
                      <p className="text-sm text-gray-700">{deal.industry}</p>
                    </div>
                  )}
                  {deal.company_stage && (
                    <div>
                      <label className={labelClass}>Stage</label>
                      <p className="text-sm text-gray-700">{deal.company_stage}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Real deal — full editable fields */
            <>
              {/* Stage + Priority row */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className={labelClass}>Stage</label>
                  <select
                    value={form.stage}
                    onChange={e => updateField('stage', e.target.value)}
                    className={inputClass}
                  >
                    {DEAL_STAGES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('priority_flag', !form.priority_flag)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                    form.priority_flag
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                  title="Toggle priority"
                >
                  <Star className={`w-4 h-4 ${form.priority_flag ? 'fill-amber-400 text-amber-400' : ''}`} />
                  {form.priority_flag ? 'Priority' : 'Flag'}
                </button>
              </div>

              {/* Assigned To */}
              <div>
                <label className={labelClass}>Assigned To</label>
                {teamMembers.length > 0 ? (
                  <select
                    value={form.assigned_to_name}
                    onChange={e => updateField('assigned_to_name', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.name}>{m.name}{m.role === 'owner' ? ' (Owner)' : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.assigned_to_name}
                    onChange={e => updateField('assigned_to_name', e.target.value)}
                    className={inputClass}
                    placeholder="Team member name"
                  />
                )}
              </div>

              {/* Next Action + Date */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-3">
                  <label className={labelClass}>Next Action</label>
                  <input
                    type="text"
                    value={form.next_action}
                    onChange={e => updateField('next_action', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Schedule intro call"
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={form.next_action_date}
                    onChange={e => updateField('next_action_date', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Deal Size + Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Deal Size ($)</label>
                  <input
                    type="text"
                    value={form.deal_size ? formatNumber(form.deal_size) : ''}
                    onChange={e => updateField('deal_size', e.target.value.replace(/[^0-9]/g, ''))}
                    className={inputClass}
                    placeholder="e.g. 2,000,000"
                  />
                </div>
                <div>
                  <label className={labelClass}>Source</label>
                  <select
                    value={form.source}
                    onChange={e => updateField('source', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select source</option>
                    {SOURCE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Round Info ── */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Round Info</h3>

                <div className="space-y-3">
                  {/* Round Type */}
                  <div>
                    <label className={labelClass}>Round Type</label>
                    <select
                      value={form.round_type}
                      onChange={e => updateField('round_type', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select round</option>
                      {ROUND_TYPES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Valuations */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Pre-Money ($)</label>
                      <input
                        type="text"
                        value={form.valuation_pre ? formatNumber(form.valuation_pre) : ''}
                        onChange={e => updateField('valuation_pre', e.target.value.replace(/[^0-9]/g, ''))}
                        className={inputClass}
                        placeholder="e.g. 10,000,000"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Post-Money ($)</label>
                      <input
                        type="text"
                        value={form.valuation_post ? formatNumber(form.valuation_post) : ''}
                        onChange={e => updateField('valuation_post', e.target.value.replace(/[^0-9]/g, ''))}
                        className={inputClass}
                        placeholder="Auto or manual"
                      />
                    </div>
                  </div>

                  {/* Lead Investor */}
                  <div>
                    <label className={labelClass}>Lead Investor</label>
                    <input
                      type="text"
                      value={form.lead_investor}
                      onChange={e => updateField('lead_investor', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Sequoia Capital"
                    />
                  </div>

                  {/* Co-Investors */}
                  <div>
                    <label className={labelClass}>Co-Investors</label>
                    <textarea
                      value={form.co_investors}
                      onChange={e => updateField('co_investors', e.target.value)}
                      rows={2}
                      className={`${inputClass} resize-none`}
                      placeholder="Comma-separated names"
                    />
                  </div>
                </div>
              </div>

              {/* Notes Timeline */}
              <div>
                <label className={labelClass}>Notes</label>
                {currentUserId ? (
                  <NotesTimeline dealId={deal.id} currentUserId={currentUserId} />
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                  </div>
                )}
              </div>

              {/* Thesis Fit */}
              <div>
                <label className={labelClass}>Thesis Fit</label>
                <textarea
                  value={form.thesis_fit}
                  onChange={e => updateField('thesis_fit', e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="How does this fit your investment thesis?"
                />
              </div>

              {/* Key Contact */}
              <div>
                <label className={labelClass}>Key Contact</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={e => updateField('contact_name', e.target.value)}
                    className={inputClass}
                    placeholder="Contact name"
                  />
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => updateField('contact_email', e.target.value)}
                    className={inputClass}
                    placeholder="Contact email"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-4">
          {isWatchlistItem ? (
            <button
              onClick={handleMoveToPipeline}
              disabled={movingToPipeline}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition bg-[#0168FE] text-white hover:bg-[#0050CC] disabled:opacity-50"
            >
              {movingToPipeline ? 'Adding to Pipeline...' : 'Move to Pipeline'}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${
                saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#0168FE] text-white hover:bg-[#0050CC] disabled:opacity-50'
              }`}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
