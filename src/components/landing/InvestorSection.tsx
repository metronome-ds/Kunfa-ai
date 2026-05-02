'use client'

import Link from 'next/link'

const bulletPoints = [
  'AI-scored deal flow from startups across the GCC',
  'Kanban pipeline to track deals from sourcing to close',
  'Watchlist companies for easy follow-up',
  'Access pitch decks and financials through secure data rooms',
]

const pipelineStages = [
  { label: 'Sourcing', count: 12, color: 'bg-[#F0F7FF]0' },
  { label: 'Screening', count: 5, color: 'bg-purple-500' },
  { label: 'Diligence', count: 3, color: 'bg-amber-500' },
  { label: 'Close', count: 1, color: 'bg-green-500' },
]

export default function InvestorSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#F8F9FB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Pipeline Visual */}
          <div className="bg-[var(--bg-elev)] rounded-2xl p-6 lg:p-8 border border-[var(--line)]">
            <p className="text-xs font-semibold text-[var(--ink-mute)] tracking-wider uppercase mb-4">Deal Pipeline</p>

            {/* Pipeline stages */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {pipelineStages.map((stage) => (
                <div key={stage.label} className="text-center">
                  <div className={`${stage.color} text-white text-xl font-bold rounded-lg py-4 mb-2`}>
                    {stage.count}
                  </div>
                  <span className="text-xs text-[var(--ink-soft)] font-medium">{stage.label}</span>
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
                <div key={deal.name} className="flex items-center justify-between px-4 py-3 bg-[#F8F9FB] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[var(--accent-soft)] rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-[var(--accent-ink)]">{deal.score}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{deal.name}</p>
                      <p className="text-xs text-[var(--ink-mute)]">{deal.stage}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--ink-faint)]">View</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Content */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#F0F7FF] text-[var(--accent-ink)] mb-4">
              For Investors
            </span>
            <h2 className="text-2xl lg:text-3xl font-bold text-kunfa-navy mb-4">
              AI-curated deal flow across the GCC
            </h2>
            <p className="text-[var(--ink-soft)] text-base mb-8 leading-relaxed">
              Discover pre-scored startups, manage your pipeline, and access secure
              data rooms — all from one platform built for GCC venture capital.
            </p>
            <ul className="space-y-4 mb-8">
              {bulletPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-[var(--accent-soft)] rounded-full flex items-center justify-center mt-0.5 shrink-0">
                    <svg className="w-3 h-3 text-[var(--accent-ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-[var(--ink-soft)]">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="border border-[var(--line-strong)] text-[var(--ink-soft)] hover:bg-[#F8F9FB] font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
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
