'use client'

interface HeroProps {
  onApplyNow: () => void
}

export default function Hero({ onApplyNow }: HeroProps) {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <div className="text-center mb-8">
          <span className="badge-green">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
            Venture Intelligence
          </span>
        </div>

        {/* Heading */}
        <div className="text-center max-w-4xl mx-auto mb-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            <span className="text-gradient-green">AI-native infrastructure</span>
            <br />
            <span className="text-kunfa-navy">for modern investors</span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-center text-kunfa-text-secondary text-lg max-w-2xl mx-auto mb-16">
          Kunfa connects startups with institutional investors through AI-powered scoring,
          due diligence automation, and real-time deal intelligence.
        </p>

        {/* Two Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Left Card — Investment Intelligence */}
          <div className="relative border border-gray-200 rounded-2xl p-8 bg-white hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-kunfa-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-kunfa-text-secondary tracking-wider uppercase mb-2">For Venture Funds</p>
            <h3 className="text-xl font-bold text-kunfa-navy mb-3">Investment Intelligence</h3>
            <p className="text-kunfa-text-secondary text-sm mb-6 leading-relaxed">
              AI-powered deal flow management, portfolio analytics, and LP reporting —
              purpose-built for venture capital and growth equity funds.
            </p>
            <a
              href="mailto:hello@vitality.capital"
              className="inline-flex items-center text-sm font-semibold text-kunfa-navy hover:text-kunfa-green transition-colors"
            >
              REQUEST ACCESS
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {['Deal Scoring', 'Pipeline CRM', 'LP Reports', 'Due Diligence'].map((tag) => (
                  <span key={tag} className="text-xs text-kunfa-text-secondary bg-gray-50 px-2.5 py-1 rounded-md">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Card — Get Your Kunfa Score */}
          <div className="relative border-2 border-kunfa-green rounded-2xl p-8 bg-white card-glow">
            {/* LIVE NOW Badge */}
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-emerald-500 rounded-full live-pulse" />
                LIVE NOW
              </span>
            </div>

            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-kunfa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-kunfa-green tracking-wider uppercase mb-2">For Startups</p>
            <h3 className="text-xl font-bold text-kunfa-navy mb-3">Get Your Kunfa Score</h3>
            <p className="text-kunfa-text-secondary text-sm mb-6 leading-relaxed">
              Upload your pitch deck and financials to receive an AI-generated investment readiness
              score with actionable feedback and benchmarking against 1,000+ startups.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={onApplyNow}
                className="bg-kunfa-green hover:bg-kunfa-green-dark text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                APPLY NOW
              </button>
              <a
                href="/demo/startup"
                className="inline-flex items-center text-sm font-semibold text-kunfa-navy hover:text-kunfa-green border border-gray-200 px-5 py-2.5 rounded-lg transition-colors"
              >
                SEE DEMO
              </a>
            </div>
            <p className="text-xs text-kunfa-text-secondary">Free score • Full memo available for $59</p>
          </div>
        </div>
      </div>
    </section>
  )
}
