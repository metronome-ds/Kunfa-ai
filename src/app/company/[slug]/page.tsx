import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CompanyActions } from '@/components/company/CompanyActions'
import { CompanyNav } from '@/components/company/CompanyNav'
import { ReportBanner } from '@/components/company/ReportBanner'
import { ScoreTooltip } from '@/components/ui/ScoreTooltip'
import { OptionalSidebarLayout } from '@/components/common/OptionalSidebarLayout'
import DealRoomSection from '@/components/dealroom/DealRoomSection'
import PaidReportBanner from '@/components/company/PaidReportBanner'

interface TeamMember {
  name: string
  title?: string
  linkedin?: string
}

interface ScoreGrades {
  team_grade: string | null
  market_grade: string | null
  product_grade: string | null
  financial_grade: string | null
}

async function getCompanyPage(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await supabase
    .from('company_pages')
    .select('*')
    .eq('slug', slug)
    .single()

  return data
}

async function getSubmissionGrades(submissionId: string | null): Promise<ScoreGrades | null> {
  if (!submissionId) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await supabase
    .from('submissions')
    .select('team_grade, market_grade, product_grade, financial_grade')
    .eq('id', submissionId)
    .single()

  return data
}

function getScoreColor(score: number | null) {
  if (!score) return 'text-gray-500 bg-gray-100 border-gray-200'
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200'
  if (score >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

function getGradeColor(grade: string) {
  if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-700'
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700'
  if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function formatRaiseAmount(amount: number | string | null) {
  if (!amount) return null
  const num = Number(amount)
  if (isNaN(num)) return String(amount)
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toLocaleString()}`
}

export default async function CompanyPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = await getCompanyPage(slug)

  if (!company) {
    notFound()
  }

  const grades = await getSubmissionGrades(company.submission_id)

  const scoreColor = getScoreColor(company.overall_score)
  const raiseFormatted = formatRaiseAmount(company.raise_amount)
  const subtitle = company.one_liner || company.description
  const hq = company.headquarters || company.country

  // Build team members list from founding_team jsonb or fallback
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

  const hasTeamSection = teamMembers.length > 0 || company.team_size || company.founded_year
  const hasFunding = raiseFormatted || company.stage || company.use_of_funds
  const hasAnalysis = company.problem_summary || company.solution_summary || company.business_model || company.traction || company.key_risks

  // Grade pills data
  const gradePills = grades ? [
    { label: 'Team', grade: grades.team_grade },
    { label: 'Market', grade: grades.market_grade },
    { label: 'Product', grade: grades.product_grade },
    { label: 'Financial', grade: grades.financial_grade },
  ].filter(p => p.grade) : []

  return (
    <OptionalSidebarLayout fallbackNav={<CompanyNav />}>
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-6">
          {/* Score badge */}
          <div className="flex flex-col items-center flex-shrink-0 gap-1">
            <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center ${scoreColor}`}>
              <span className="text-3xl font-bold">{company.overall_score ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Kunfa Score</span>
              <ScoreTooltip />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>

            {/* Subtitle / one-liner */}
            {subtitle && (
              <p className="text-gray-600 mt-1 text-sm leading-relaxed line-clamp-2">{subtitle}</p>
            )}

            {/* Tags row: industry, stage, HQ, website, linkedin */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {company.industry && (
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  {company.industry}
                </span>
              )}
              {company.stage && (
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                  {company.stage}
                </span>
              )}
              {hq && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                  {/* Map pin icon */}
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  {hq}
                </span>
              )}
              {company.website_url && (
                <a
                  href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition"
                >
                  {/* External link icon */}
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  {company.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              )}
              {company.company_linkedin_url && (
                <a
                  href={company.company_linkedin_url.startsWith('http') ? company.company_linkedin_url : `https://${company.company_linkedin_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-medium hover:bg-[#0A66C2]/20 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a>
              )}
            </div>

            {/* Score category pills */}
            {gradePills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {gradePills.map(p => (
                  <span key={p.label} className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${getGradeColor(p.grade!)}`}>
                    {p.label}: {p.grade}
                  </span>
                ))}
              </div>
            )}

            {/* Document buttons — visible to everyone */}
            {(company.pdf_url || company.financials_url) && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {company.pdf_url && (
                  <a
                    href={company.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    View Pitch Deck
                  </a>
                )}
                {company.financials_url && (
                  <a
                    href={company.financials_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 13.125c0-.621.504-1.125 1.125-1.125" />
                    </svg>
                    View Financials
                  </a>
                )}
              </div>
            )}

            {/* Action row: investor actions + edit (auth-gated) */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <CompanyActions
                companyId={company.id}
                claimStatus={company.claim_status}
                claimToken={company.claim_token}
                claimInvitedEmail={company.claim_invited_email}
                company={{
                  id: company.id,
                  company_name: company.company_name,
                  one_liner: company.one_liner,
                  description: company.description,
                  industry: company.industry,
                  stage: company.stage,
                  country: company.country,
                  headquarters: company.headquarters,
                  website_url: company.website_url,
                  linkedin_url: company.linkedin_url,
                  raise_amount: company.raise_amount,
                  team_size: company.team_size,
                  founded_year: company.founded_year,
                  founder_name: company.founder_name,
                  founder_title: company.founder_title,
                  added_by: company.added_by,
                  user_id: company.user_id,
                }}
              />
            </div>
          </div>
        </div>

        {/* Report Banner */}
        <Suspense fallback={null}>
          <ReportBanner submissionId={company.submission_id} />
        </Suspense>

        {/* Post-payment report generation indicator */}
        <Suspense fallback={null}>
          <PaidReportBanner submissionId={company.submission_id} />
        </Suspense>

        {/* Overview */}
        {company.description && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Overview</h2>
            <p className="text-gray-600 leading-relaxed">{company.description}</p>
          </div>
        )}

        {/* Team */}
        {hasTeamSection && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Team</h2>

            {/* Team member cards */}
            {teamMembers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {teamMembers.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                    {/* Avatar placeholder */}
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-500">
                        {member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                      {member.title && (
                        <p className="text-xs text-gray-500 truncate">{member.title}</p>
                      )}
                    </div>
                    {member.linkedin && (
                      <a
                        href={member.linkedin.startsWith('http') ? member.linkedin : `https://${member.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-[#0A66C2] hover:text-[#004182] transition"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Team size + founded year */}
            {(company.team_size || company.founded_year) && (
              <div className="flex items-center gap-6 text-sm text-gray-600">
                {company.team_size && (
                  <span>Team Size: <span className="font-semibold text-gray-900">{company.team_size}</span></span>
                )}
                {company.founded_year && (
                  <span>Founded: <span className="font-semibold text-gray-900">{company.founded_year}</span></span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Funding */}
        {hasFunding && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Funding</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {raiseFormatted && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Raise Amount</p>
                  <p className="text-lg font-semibold text-gray-900">{raiseFormatted}</p>
                </div>
              )}
              {company.stage && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Stage</p>
                  <p className="text-lg font-semibold text-gray-900">{company.stage}</p>
                </div>
              )}
            </div>
            {company.use_of_funds && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Use of Funds</p>
                <p className="text-gray-600 text-sm leading-relaxed">{company.use_of_funds}</p>
              </div>
            )}
          </div>
        )}

        {/* Traction */}
        {company.traction && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Traction</h2>
            <p className="text-gray-600 leading-relaxed">{company.traction}</p>
          </div>
        )}

        {/* AI Analysis */}
        {hasAnalysis && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">AI Analysis</h2>
            <div className="space-y-5">
              {company.problem_summary && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Problem</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{company.problem_summary}</p>
                </div>
              )}
              {company.solution_summary && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Solution</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{company.solution_summary}</p>
                </div>
              )}
              {company.business_model && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Business Model</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{company.business_model}</p>
                </div>
              )}
              {company.key_risks && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Key Risks</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{company.key_risks}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deal Room */}
        <DealRoomSection
          companyId={company.id}
          companyName={company.company_name}
          companyUserId={company.user_id}
          companyAddedBy={company.added_by}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} Kunfa.AI</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-gray-600 transition">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition">Privacy</Link>
          </div>
        </div>
      </footer>
    </OptionalSidebarLayout>
  )
}
