import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CompanyActions } from '@/components/company/CompanyActions'

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

function getScoreColor(score: number | null) {
  if (!score) return 'text-gray-500 bg-gray-100 border-gray-200'
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200'
  if (score >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  return 'text-red-700 bg-red-50 border-red-200'
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

  const scoreColor = getScoreColor(company.overall_score)
  const raiseFormatted = formatRaiseAmount(company.raise_amount)

  const hasOverview = company.description || company.website_url || company.founder_name
  const hasFunding = raiseFormatted || company.stage || company.use_of_funds
  const hasTeam = company.founder_name || company.team_size || company.founded_year
  const hasAnalysis = company.problem_summary || company.solution_summary || company.business_model || company.traction || company.key_risks

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-gray-900 font-semibold text-lg">Kunfa.AI</span>
          </Link>
          <Link
            href="/"
            className="bg-[#10B981] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#059669] transition"
          >
            Get Your Score
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-6">
          {/* Score badge */}
          <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center flex-shrink-0 ${scoreColor}`}>
            <span className="text-3xl font-bold">{company.overall_score ?? '—'}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
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
              {company.country && (
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                  {company.country}
                </span>
              )}
            </div>

            {/* Investor Actions */}
            <div className="mt-4">
              <CompanyActions companyId={company.id} />
            </div>
          </div>
        </div>

        {/* Overview */}
        {hasOverview && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Overview</h2>
            {company.description && (
              <p className="text-gray-600 leading-relaxed mb-4">{company.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {company.founder_name && (
                <div className="text-sm">
                  <span className="text-gray-500">Founder: </span>
                  <span className="text-gray-900 font-medium">{company.founder_name}</span>
                  {company.founder_title && (
                    <span className="text-gray-500"> — {company.founder_title}</span>
                  )}
                </div>
              )}
              {company.website_url && (
                <a
                  href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#10B981] text-sm hover:underline"
                >
                  {company.website_url.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Funding Ask */}
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

        {/* Team */}
        {hasTeam && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Team</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {company.founder_name && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Founder</p>
                  <p className="text-gray-900 font-medium">{company.founder_name}</p>
                  {company.founder_title && (
                    <p className="text-gray-500 text-sm">{company.founder_title}</p>
                  )}
                </div>
              )}
              {company.team_size && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Team Size</p>
                  <p className="text-lg font-semibold text-gray-900">{company.team_size}</p>
                </div>
              )}
              {company.founded_year && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Founded</p>
                  <p className="text-lg font-semibold text-gray-900">{company.founded_year}</p>
                </div>
              )}
            </div>
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

        {/* CTA */}
        {company.submission_id && (
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-8 border border-emerald-200 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Get the Full Investment Memo</h2>
            <p className="text-gray-600 mb-6 text-sm max-w-md mx-auto">
              Detailed AI-powered analysis with actionable insights, risk assessment, and investment recommendations.
            </p>
            <a
              href={`/api/stripe/checkout?submissionId=${company.submission_id}`}
              className="inline-block bg-[#10B981] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#059669] transition"
            >
              Get Full Investment Memo
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
