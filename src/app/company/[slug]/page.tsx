import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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
  if (!score) return 'text-gray-400 bg-gray-700'
  if (score >= 80) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
  if (score >= 60) return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
  if (score >= 40) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
  return 'text-red-400 bg-red-500/20 border-red-500/30'
}

export default async function CompanyPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = await getCompanyPage(slug)

  if (!company) {
    notFound()
  }

  const scoreColor = getScoreColor(company.overall_score)

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-white font-semibold text-lg">Kunfa.AI</span>
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
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          {/* Score badge */}
          <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center flex-shrink-0 ${scoreColor}`}>
            <span className="text-3xl font-bold">{company.overall_score ?? '—'}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white">{company.company_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {company.industry && (
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">
                  {company.industry}
                </span>
              )}
              {company.stage && (
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
                  {company.stage}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key metrics */}
        {(company.raise_amount || company.team_size) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {company.raise_amount && (
              <div className="bg-[#1E293B] rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Raise Amount</p>
                <p className="text-lg font-semibold text-white">
                  ${Number(company.raise_amount).toLocaleString()}
                </p>
              </div>
            )}
            {company.team_size && (
              <div className="bg-[#1E293B] rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Team Size</p>
                <p className="text-lg font-semibold text-white">{company.team_size}</p>
              </div>
            )}
            {company.founded_year && (
              <div className="bg-[#1E293B] rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Founded</p>
                <p className="text-lg font-semibold text-white">{company.founded_year}</p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {company.description && (
          <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700 mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">About</h2>
            <p className="text-gray-300 leading-relaxed">{company.description}</p>
          </div>
        )}

        {company.website_url && (
          <div className="mb-8">
            <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-[#10B981] text-sm hover:underline">
              {company.website_url}
            </a>
          </div>
        )}

        {/* CTA */}
        {company.submission_id && (
          <div className="bg-gradient-to-r from-[#10B981]/10 to-blue-500/10 rounded-xl p-8 border border-[#10B981]/20 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Get the Full Investment Memo</h2>
            <p className="text-gray-400 mb-6 text-sm max-w-md mx-auto">
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
