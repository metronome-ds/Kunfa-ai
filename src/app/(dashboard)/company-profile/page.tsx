'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Copy, Check, FileText } from 'lucide-react'

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

export default function CompanyProfilePage() {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [paid, setPaid] = useState(false)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetch() {
      try {
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
    fetch()
  }, [])

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
    </div>
  )
}
