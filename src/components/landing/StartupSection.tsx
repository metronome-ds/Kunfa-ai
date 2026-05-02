'use client'

interface StartupSectionProps {
  onApplyNow: () => void
}

const bulletPoints = [
  'Instant AI-generated investment readiness score',
  'Stage-adjusted analysis across 6 scoring dimensions',
  'Public company profile visible to verified investors',
  'Actionable feedback to improve your fundraise',
]

export default function StartupSection({ onApplyNow }: StartupSectionProps) {
  return (
    <section className="py-20 lg:py-28 bg-[var(--bg-elev)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Content */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#F0F7FF] text-[var(--accent-ink)] mb-4">
              For Startups
            </span>
            <h2 className="text-2xl lg:text-3xl font-bold text-kunfa-navy mb-4">
              Get instant AI feedback on your fundraising readiness
            </h2>
            <p className="text-[var(--ink-soft)] text-base mb-8 leading-relaxed">
              Upload your deck, get scored by our AI, and gain instant visibility
              to verified investors across the GCC. No warm intros needed.
            </p>
            <ul className="space-y-4 mb-8">
              {bulletPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-[var(--accent-soft)] rounded-full flex items-center justify-center mt-0.5 shrink-0">
                    <svg className="w-3 h-3 text-kunfa" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-[var(--ink-soft)]">{point}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={onApplyNow}
              className="bg-kunfa hover:bg-kunfa-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              Get Your Score
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>

          {/* Right — Score Badge Visual */}
          <div className="bg-[#F8F9FB] rounded-2xl p-8 lg:p-10 border border-[var(--line)]">
            {/* Score display */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-[var(--bg-elev)] border-4 border-[var(--line-strong)]/30 mb-4">
                <span className="text-4xl font-bold text-[var(--accent-ink)]">78</span>
              </div>
              <p className="text-sm font-semibold text-kunfa-navy">Kunfa Score</p>
              <p className="text-xs text-[var(--ink-mute)] mt-1">Investment Readiness</p>
            </div>

            {/* Dimension breakdown */}
            <div className="space-y-3">
              {[
                { label: 'Team & Founders', score: 82, color: 'bg-[var(--ink)]' },
                { label: 'Market Opportunity', score: 75, color: 'bg-[#F0F7FF]0' },
                { label: 'Product & Traction', score: 80, color: 'bg-indigo-500' },
                { label: 'Financials', score: 68, color: 'bg-amber-500' },
              ].map((dim) => (
                <div key={dim.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[var(--ink-soft)] font-medium">{dim.label}</span>
                    <span className="text-sm font-semibold text-[var(--ink)]">{dim.score}</span>
                  </div>
                  <div className="w-full bg-[var(--bg-sunk)] rounded-full h-2">
                    <div className={`${dim.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${dim.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
