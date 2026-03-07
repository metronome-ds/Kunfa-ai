import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'

async function getCompanyPage(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await supabase
    .from('company_pages')
    .select('*, submissions(overall_score, full_analysis)')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  return data
}

export default async function CompanyPublicPage({ params }: { params: { slug: string } }) {
  const company = await getCompanyPage(params.slug)

  if (!company) {
    notFound()
  }

  const analysis = (company.submissions as any)?.full_analysis
  const dimensions = analysis?.dimensions || {}

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
        <div className="text-center mb-10">
          {company.logo_url && (
            <img src={company.logo_url} alt="" className="w-20 h-20 rounded-xl mx-auto mb-4 object-cover" />
          )}
          <h1 className="text-3xl font-bold text-white">{company.company_name}</h1>
          {company.description && (
            <p className="text-gray-400 mt-3 max-w-2xl mx-auto">{company.description}</p>
          )}
          {company.website_url && (
            <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-[#10B981] text-sm hover:underline mt-2 inline-block">
              {company.website_url}
            </a>
          )}
        </div>

        {/* Score */}
        <div className="bg-[#1E293B] rounded-xl p-8 border border-gray-700 text-center mb-8">
          <p className="text-gray-400 text-sm mb-2">Kunfa Score</p>
          <div className="text-6xl font-bold text-[#10B981]">{company.overall_score ?? '—'}</div>
          <p className="text-gray-500 text-sm mt-2">out of 100</p>
        </div>

        {/* Dimensions */}
        {Object.keys(dimensions).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Object.entries(dimensions).map(([key, dim]: [string, any]) => (
              <div key={key} className="bg-[#1E293B] rounded-xl p-5 border border-gray-700 text-center">
                <div className="text-3xl font-bold text-white">{dim?.score ?? '—'}</div>
                <div className="text-xs text-gray-400 capitalize mt-1">{key}</div>
                {dim?.letter_grade && (
                  <div className="text-xs text-[#10B981] font-medium mt-1 bg-[#10B981]/10 inline-block px-2 py-0.5 rounded">
                    {dim.letter_grade}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-400 mb-4">Want to see how your startup compares?</p>
          <Link
            href="/"
            className="inline-block bg-[#10B981] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#059669] transition"
          >
            Get Your Own Kunfa Score
          </Link>
        </div>
      </main>
    </div>
  )
}
