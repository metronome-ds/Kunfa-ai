import Link from 'next/link'

export const metadata = {
  title: 'How Kunfa Scoring Works | Kunfa.AI',
  description: 'How the Kunfa Score is calculated — 6 dimensions, stage-adjusted weights, and the 75+ eligibility threshold for investor discovery.',
}

const DIMENSIONS = [
  {
    icon: '👥',
    name: 'Team & Founders',
    description:
      'Founder quality, domain expertise, prior exits, team completeness, and advisors. Early-stage investing is primarily a bet on people, so this carries the most weight at pre-seed and seed.',
  },
  {
    icon: '📈',
    name: 'Market Opportunity',
    description:
      'TAM / SAM / SOM with credible sources, growth rate, timing, competitive dynamics, and why your positioning wins.',
  },
  {
    icon: '💡',
    name: 'Product & Tech',
    description:
      'Product maturity, technical moat, differentiation vs. incumbents, proprietary data or IP, and the strength of the core user experience.',
  },
  {
    icon: '📊',
    name: 'Traction & Growth',
    description:
      'Revenue, users, engagement, retention, and month-over-month growth. This dimension grows in weight as companies move from seed to Series A and beyond.',
  },
  {
    icon: '💰',
    name: 'Financial Health',
    description:
      'Unit economics, burn, runway, projections, and path to profitability. Financial discipline matters more as the round size and valuation increase.',
  },
  {
    icon: '🎯',
    name: 'Fundraise Readiness',
    description:
      'Clarity on round size, instrument, use of funds, milestones, and data-room completeness. Measures how ready the company is to close a round right now.',
  },
]

const WEIGHTS = [
  {
    stage: 'Pre-Seed / Seed',
    rows: [
      { label: 'Team & Founders', pct: 30 },
      { label: 'Market Opportunity', pct: 25 },
      { label: 'Product & Tech', pct: 20 },
      { label: 'Traction & Growth', pct: 5 },
      { label: 'Financial Health', pct: 10 },
      { label: 'Fundraise Readiness', pct: 10 },
    ],
  },
  {
    stage: 'Series A',
    rows: [
      { label: 'Team & Founders', pct: 20 },
      { label: 'Market Opportunity', pct: 20 },
      { label: 'Product & Tech', pct: 15 },
      { label: 'Traction & Growth', pct: 20 },
      { label: 'Financial Health', pct: 15 },
      { label: 'Fundraise Readiness', pct: 10 },
    ],
  },
  {
    stage: 'Series B+',
    rows: [
      { label: 'Team & Founders', pct: 10 },
      { label: 'Market Opportunity', pct: 15 },
      { label: 'Product & Tech', pct: 15 },
      { label: 'Traction & Growth', pct: 25 },
      { label: 'Financial Health', pct: 25 },
      { label: 'Fundraise Readiness', pct: 10 },
    ],
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#007CF8] flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Kunfa.AI</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900 transition"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <header className="mb-12">
          <p className="text-xs font-semibold text-[#007CF8] uppercase tracking-wider mb-3">
            How it works
          </p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How the Kunfa Score is calculated
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Every company on Kunfa is scored on six dimensions. We use stage-adjusted
            weights so early-stage companies are judged on team and market, while
            growth-stage companies are judged on traction and financials.
          </p>
        </header>

        {/* 75+ callout */}
        <section className="mb-12 rounded-2xl border border-[#007CF8]/20 bg-[#007CF8]/5 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            The 75+ threshold
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Companies with a Kunfa Score of <strong>75 or higher</strong> become
            eligible for investor discovery — they appear in the browse directory and
            can be added to investor pipelines and watchlists. Companies below 75 stay
            private to their founders and can keep improving until they qualify.
          </p>
        </section>

        {/* 6 dimensions */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">The six dimensions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {DIMENSIONS.map((d) => (
              <div
                key={d.name}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{d.icon}</span>
                  <h3 className="text-sm font-semibold text-gray-900">{d.name}</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{d.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stage weights */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Stage-adjusted weights
          </h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            The same score framework scales with company stage. Pre-seed founders
            don&apos;t need $10M in revenue — they need a credible team and market.
            Series B companies don&apos;t get a pass on financials.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {WEIGHTS.map((col) => (
              <div
                key={col.stage}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {col.stage}
                </h3>
                <div className="space-y-2">
                  {col.rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{r.label}</span>
                      <span className="text-xs font-semibold text-gray-900 tabular-nums">
                        {r.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How to improve */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            How to improve your score
          </h2>
          <ul className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <li className="flex gap-3">
              <span className="text-[#007CF8] font-bold">1.</span>
              <span>
                Upload a complete pitch deck and a financial model (not just a P&amp;L).
                The scoring engine reads both documents end-to-end.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#007CF8] font-bold">2.</span>
              <span>
                Fill in every profile field — founders, LinkedIn URLs, team size,
                industry, stage, country, website. Gaps lower your score.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#007CF8] font-bold">3.</span>
              <span>
                Address the weakest dimensions shown on your dashboard. Then re-score.
                You can re-score as your company evolves.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#007CF8] font-bold">4.</span>
              <span>
                Be specific. Concrete numbers, named customers, and dated milestones
                always beat adjectives.
              </span>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-gradient-to-br from-[#007CF8] to-indigo-700 p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Ready to get scored?</h2>
          <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
            Upload your pitch deck and get a full Kunfa Score across all six dimensions
            in minutes.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#007CF8] rounded-lg text-sm font-semibold hover:bg-white/90 transition"
          >
            Get Your Kunfa Score
          </Link>
        </section>
      </main>
    </div>
  )
}
