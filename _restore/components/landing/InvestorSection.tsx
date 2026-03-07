'use client'

const stats = [
  { label: 'Total AUM', value: '$312M' },
  { label: 'Active Deals', value: '47' },
  { label: 'Portfolio', value: '24' },
  { label: 'IRR', value: '28.4%' },
]

const barHeights = [65, 45, 80, 55, 70, 90, 40, 75, 60, 85, 50, 95]

const bulletPoints = [
  'AI-powered deal scoring and pipeline management',
  'Automated due diligence with document analysis',
  'Real-time portfolio monitoring and alerts',
  'Institutional-grade LP reporting and dashboards',
]

export default function InvestorSection() {
  return (
    <section id="product" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Dashboard Mockup */}
          <div className="bg-kunfa-card-dark rounded-2xl p-6 lg:p-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-kunfa-navy/50 rounded-xl p-4">
                  <p className="text-gray-400 text-xs font-medium mb-1">{stat.label}</p>
                  <p className="text-white text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Bar Chart */}
            <div>
              <p className="text-gray-400 text-xs font-medium mb-4">Deal Pipeline</p>
              <div className="flex items-end gap-2 h-32">
                {barHeights.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all duration-300"
                    style={{
                      height: `${height}%`,
                      backgroundColor: i % 3 === 0 ? '#10B981' : i % 3 === 1 ? '#3B82F6' : '#6366F1',
                      opacity: 0.7 + (i * 0.025),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right — Content */}
          <div>
            <span className="badge-green mb-4 inline-flex">
              💼 For Investors
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-kunfa-navy mt-4 mb-4">
              Streamline your entire deal flow
            </h2>
            <p className="text-kunfa-text-secondary text-lg mb-8 leading-relaxed">
              From sourcing to close, Kunfa gives venture teams a unified platform to evaluate deals
              faster, collaborate seamlessly, and deliver institutional-grade reporting to LPs.
            </p>
            <ul className="space-y-4 mb-8">
              {bulletPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                    <svg className="w-3 h-3 text-kunfa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-kunfa-text-secondary">{point}</span>
                </li>
              ))}
            </ul>
            <a
              href="mailto:hello@vitality.capital"
              className="btn-primary inline-flex items-center gap-2"
            >
              Request Demo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
