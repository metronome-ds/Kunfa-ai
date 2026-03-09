'use client'

import Link from 'next/link'

const bulletPoints = [
  'AI-scored deal flow from startups across the GCC',
  'Kanban pipeline to track deals from sourcing to close',
  'Watchlist companies for easy follow-up',
  'Access pitch decks and financials through secure data rooms',
]

const pipelineStages = [
  { label: 'Sourcing', count: 12, color: 'bg-blue-500' },
  { label: 'Screening', count: 5, color: 'bg-purple-500' },
  { label: 'Diligence', count: 3, color: 'bg-amber-500' },
  { label: 'Close', count: 1, color: 'bg-green-500' },
]

export default function InvestorSection() {
  return (
    <section className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Pipeline Visual */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-4">Deal Pipeline</p>

            {/* Pipeline stages */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {pipelineStages.map((stage) => (
                <div key={stage.label} className="text-center">
                  <div className={`${stage.color} text-white text-xl font-bold rounded-lg py-4 mb-2`}>
                    {stage.count}
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{stage.label}</span>
                </div>
              ))}
            </div>

            {/* Mini deal cards */}
            <div className="space-y-2">
              {[
                { name: 'FinStack AI', score: 85, stage: 'Series A' },
                { name: 'GreenLogi', score: 72, stage: 'Seed' },
                { name: 'PayBridge', score: 91, stage: 'Series B' },
              ].map((deal) => (
                <div key={deal.name} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-[#0168FE]">{deal.score}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{deal.name}</p>
                      <p className="text-xs text-gray-500">{deal.stage}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-400">View</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Content */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mb-4">
              For Investors
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-kunfa-navy mb-4">
              AI-curated deal flow across the GCC
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Discover pre-scored startups, manage your pipeline, and access secure
              data rooms — all from one platform built for GCC venture capital.
            </p>
            <ul className="space-y-4 mb-8">
              {bulletPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-gray-600">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              Create Investor Account
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
