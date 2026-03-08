'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Copy, Check, FileText, Pencil, RefreshCw, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import RescoringModal from '@/components/scoring/RescoringModal'

interface TeamMember {
  name: string
  title?: string
  linkedin?: string
}

interface CompanyData {
  id: string
  slug: string
  company_name: string
  one_liner: string | null
  description: string | null
  industry: string | null
  stage: string | null
  country: string | null
  headquarters: string | null
  website_url: string | null
  linkedin_url: string | null
  overall_score: number | null
  raise_amount: number | string | null
  team_size: number | null
  founded_year: number | null
  founder_name: string | null
  founder_title: string | null
  founding_team: TeamMember[] | null
  use_of_funds: string | null
  traction: string | null
  problem_summary: string | null
  solution_summary: string | null
  business_model: string | null
  key_risks: string | null
  pdf_url: string | null
  submission_id: string | null
  created_at: string
}

const INDUSTRIES = [
  'AI & Machine Learning', 'B2B SaaS', 'B2C', 'Biotech & Life Sciences',
  'CleanTech & Energy', 'Consumer Hardware', 'Cybersecurity', 'DevTools & Infrastructure',
  'E-commerce & Marketplace', 'EdTech', 'FinTech', 'Food & Beverage', 'Gaming',
  'HealthTech', 'Logistics & Supply Chain', 'Media & Entertainment',
  'PropTech & Real Estate', 'Social', 'Travel & Hospitality', 'Web3 & Crypto', 'Other',
]

const STAGES = [
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c+', label: 'Series C+' },
  { value: 'growth', label: 'Growth' },
]

function getScoreColor(score: number | null) {
  if (!score) return 'text-gray-400 bg-gray-800 border-gray-700'
  if (score >= 80) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
  if (score >= 60) return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
  if (score >= 40) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
  return 'text-red-400 bg-red-500/20 border-red-500/30'
}

function formatRaiseAmount(amount: number | string | null) {
  if (!amount) return null
  const num = Number(amount)
  if (isNaN(num)) return String(amount)
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toLocaleString()}`
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

const INPUT_CLASS = 'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const SELECT_CLASS = 'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

export default function CompanyProfilePage() {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [paid, setPaid] = useState(false)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  // Re-scoring modal
  const [showRescore, setShowRescore] = useState(false)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editForm, setEditForm] = useState({
    company_name: '',
    one_liner: '',
    industry: '',
    stage: '',
    country: '',
    headquarters: '',
    website_url: '',
    linkedin_url: '',
    raise_amount: '',
    team_size: '',
    founded_year: '',
    use_of_funds: '',
    traction: '',
  })

  useEffect(() => {
    async function load() {
      try {
        // Get user email for re-scoring
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) setUserEmail(user.email)

        const res = await window.fetch('/api/my-company')
        const data = await res.json()
        setCompany(data.company || null)
        setPaid(!!data.paid)
        setReportUrl(data.reportUrl || null)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const startEditing = () => {
    if (!company) return
    setEditForm({
      company_name: company.company_name || '',
      one_liner: company.one_liner || '',
      industry: company.industry || '',
      stage: company.stage || '',
      country: company.country || '',
      headquarters: company.headquarters || '',
      website_url: company.website_url || '',
      linkedin_url: company.linkedin_url || '',
      raise_amount: company.raise_amount ? String(company.raise_amount) : '',
      team_size: company.team_size ? String(company.team_size) : '',
      founded_year: company.founded_year ? String(company.founded_year) : '',
      use_of_funds: company.use_of_funds || '',
      traction: company.traction || '',
    })
    setEditing(true)
    setSaveSuccess(false)
  }

  const cancelEditing = () => {
    setEditing(false)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/my-company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: editForm.company_name || undefined,
          one_liner: editForm.one_liner || null,
          industry: editForm.industry || null,
          stage: editForm.stage || null,
          country: editForm.country || null,
          headquarters: editForm.headquarters || null,
          website_url: editForm.website_url || null,
          linkedin_url: editForm.linkedin_url || null,
          raise_amount: editForm.raise_amount ? Number(editForm.raise_amount) : null,
          team_size: editForm.team_size ? Number(editForm.team_size) : null,
          founded_year: editForm.founded_year ? Number(editForm.founded_year) : null,
          use_of_funds: editForm.use_of_funds || null,
          traction: editForm.traction || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setCompany(data.company)
        setEditing(false)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = () => {
    if (!company?.slug) return
    navigator.clipboard.writeText(`https://kunfa-ai.vercel.app/company/${company.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Company Profile</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-gray-700 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // No company page — show CTA
  if (!company) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Company Profile</h1>
        <div className="bg-gray-800/50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-500" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No company profile yet</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Get your Kunfa Score to create your company profile. Investors will be able to discover and evaluate your startup.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition"
          >
            Get Your Kunfa Score
          </Link>
        </div>
      </div>
    )
  }

  const hq = company.headquarters || company.country
  const raiseFormatted = formatRaiseAmount(company.raise_amount)
  const scored = company.created_at ? daysSince(company.created_at) : null

  // Build team members
  const teamMembers: TeamMember[] = []
  if (company.founding_team && Array.isArray(company.founding_team) && company.founding_team.length > 0) {
    for (const m of company.founding_team) {
      if (m && typeof m === 'object' && m.name) {
        teamMembers.push({ name: m.name, title: m.title, linkedin: m.linkedin })
      }
    }
  }
  if (teamMembers.length === 0 && company.founder_name) {
    teamMembers.push({
      name: company.founder_name,
      title: company.founder_title || undefined,
      linkedin: company.linkedin_url || undefined,
    })
  }

  const hasAnalysis = company.problem_summary || company.solution_summary || company.business_model || company.key_risks

  return (
    <div className="p-8">
      {/* Header row: score + company info + actions */}
      <div className="flex items-start gap-6 mb-8">
        {/* Score badge */}
        <div className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center flex-shrink-0 ${getScoreColor(company.overall_score)}`}>
          <span className="text-3xl font-bold">{company.overall_score ?? '—'}</span>
          {scored !== null && (
            <span className="text-[10px] opacity-60">{scored}d ago</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">{company.company_name}</h1>
          {company.one_liner && (
            <p className="text-gray-400 text-sm mt-1">{company.one_liner}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {company.industry && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                {company.industry}
              </span>
            )}
            {company.stage && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                {company.stage}
              </span>
            )}
            {hq && (
              <span className="px-2.5 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs font-medium">
                {hq}
              </span>
            )}
          </div>

          {/* Links row */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {company.website_url && (
              <a
                href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition"
              >
                <ExternalLink className="w-3 h-3" />
                {company.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            )}
            {company.linkedin_url && (
              <a
                href={company.linkedin_url.startsWith('http') ? company.linkedin_url : `https://${company.linkedin_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Link
            href={`/company/${company.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            View Public Profile
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setShowRescore(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Update My Score
          </button>
          <button
            onClick={editing ? cancelEditing : startEditing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-600 transition"
          >
            {editing ? (
              <>
                <X className="w-3.5 h-3.5" />
                Cancel Editing
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </>
            )}
          </button>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-600 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Share Profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save success */}
      {saveSuccess && (
        <div className="rounded-xl p-3 mb-6 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-400">Profile updated successfully.</p>
        </div>
      )}

      {/* Edit Mode Form */}
      {editing && (
        <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-sm font-semibold text-white mb-4">Edit Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Company Name</label>
              <input type="text" value={editForm.company_name}
                onChange={(e) => setEditForm(f => ({ ...f, company_name: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">One-Liner</label>
              <input type="text" value={editForm.one_liner}
                onChange={(e) => setEditForm(f => ({ ...f, one_liner: e.target.value }))}
                maxLength={160}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Industry</label>
              <select value={editForm.industry}
                onChange={(e) => setEditForm(f => ({ ...f, industry: e.target.value }))}
                className={SELECT_CLASS}>
                <option value="">Select...</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stage</label>
              <select value={editForm.stage}
                onChange={(e) => setEditForm(f => ({ ...f, stage: e.target.value }))}
                className={SELECT_CLASS}>
                <option value="">Select...</option>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Country / HQ</label>
              <input type="text" value={editForm.country}
                onChange={(e) => setEditForm(f => ({ ...f, country: e.target.value, headquarters: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Website</label>
              <input type="url" value={editForm.website_url}
                onChange={(e) => setEditForm(f => ({ ...f, website_url: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">LinkedIn URL</label>
              <input type="url" value={editForm.linkedin_url}
                onChange={(e) => setEditForm(f => ({ ...f, linkedin_url: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Raise Amount ($)</label>
              <input type="number" value={editForm.raise_amount}
                onChange={(e) => setEditForm(f => ({ ...f, raise_amount: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Team Size</label>
              <input type="number" value={editForm.team_size}
                onChange={(e) => setEditForm(f => ({ ...f, team_size: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Founded Year</label>
              <input type="number" value={editForm.founded_year}
                onChange={(e) => setEditForm(f => ({ ...f, founded_year: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Use of Funds</label>
              <textarea value={editForm.use_of_funds}
                onChange={(e) => setEditForm(f => ({ ...f, use_of_funds: e.target.value }))}
                rows={2}
                className={INPUT_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Traction</label>
              <textarea value={editForm.traction}
                onChange={(e) => setEditForm(f => ({ ...f, traction: e.target.value }))}
                rows={2}
                className={INPUT_CLASS} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={cancelEditing}
              className="px-6 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report Status */}
      {company.submission_id && (
        <div className={`rounded-xl p-4 mb-6 border ${
          paid
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          {paid && reportUrl ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Kunfa Readiness Report</h3>
                <p className="text-xs text-gray-400 mt-0.5">Your full AI-powered investment analysis is ready.</p>
              </div>
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
              >
                View Report
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Unlock Your Full Readiness Report</h3>
                <p className="text-xs text-gray-400 mt-0.5">Detailed analysis, sector benchmarks, and actionable recommendations.</p>
              </div>
              <a
                href={`/api/stripe/checkout?submissionId=${company.submission_id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
              >
                Unlock Report — $59
              </a>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {/* Overview */}
        {company.description && (
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Overview</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{company.description}</p>
          </div>
        )}

        {/* Funding */}
        {(raiseFormatted || company.stage || company.use_of_funds) && (
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Funding</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
              {raiseFormatted && (
                <div>
                  <p className="text-[10px] text-gray-500 mb-0.5">Raise Amount</p>
                  <p className="text-lg font-semibold text-white">{raiseFormatted}</p>
                </div>
              )}
              {company.stage && (
                <div>
                  <p className="text-[10px] text-gray-500 mb-0.5">Stage</p>
                  <p className="text-lg font-semibold text-white">{company.stage}</p>
                </div>
              )}
            </div>
            {company.use_of_funds && (
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">Use of Funds</p>
                <p className="text-gray-300 text-sm leading-relaxed">{company.use_of_funds}</p>
              </div>
            )}
          </div>
        )}

        {/* Team */}
        {(teamMembers.length > 0 || company.team_size || company.founded_year) && (
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Team</h2>
            {teamMembers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                {teamMembers.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/50">
                    <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-300">
                        {member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{member.name}</p>
                      {member.title && (
                        <p className="text-xs text-gray-400 truncate">{member.title}</p>
                      )}
                    </div>
                    {member.linkedin && (
                      <a
                        href={member.linkedin.startsWith('http') ? member.linkedin : `https://${member.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(company.team_size || company.founded_year) && (
              <div className="flex items-center gap-6 text-sm text-gray-400">
                {company.team_size && (
                  <span>Team Size: <span className="font-semibold text-white">{company.team_size}</span></span>
                )}
                {company.founded_year && (
                  <span>Founded: <span className="font-semibold text-white">{company.founded_year}</span></span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Traction */}
        {company.traction && (
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Traction</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{company.traction}</p>
          </div>
        )}

        {/* AI Analysis */}
        {hasAnalysis && (
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Analysis</h2>
            <div className="space-y-4">
              {company.problem_summary && (
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-1">Problem</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{company.problem_summary}</p>
                </div>
              )}
              {company.solution_summary && (
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-1">Solution</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{company.solution_summary}</p>
                </div>
              )}
              {company.business_model && (
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-1">Business Model</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{company.business_model}</p>
                </div>
              )}
              {company.key_risks && (
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-1">Key Risks</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{company.key_risks}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Re-scoring Modal */}
      {company && (
        <RescoringModal
          isOpen={showRescore}
          onClose={() => setShowRescore(false)}
          companyPageId={company.id}
          companyName={company.company_name}
          currentScore={company.overall_score}
          email={userEmail}
        />
      )}
    </div>
  )
}
