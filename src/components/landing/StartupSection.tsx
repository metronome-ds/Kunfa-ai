'use client'

interface StartupSectionProps {
  onApplyNow: () => void
}

const bulletPoints = [
  'AI-generated investment readiness score',
  'Benchmarking against 1,000+ funded startups',
  'Personalized pitch deck recommendations',
  'Direct visibility to 500+ verified investors',
]

const profileItems = [
  { label: 'Company Overview', points: '+100 pts', color: 'bg-kunfa-green', completed: true },
  { label: 'Team & Founders', points: '+150 pts', color: 'bg-kunfa-yellow', completed: true },
  { label: 'Data Room', points: '+500 pts', color: 'bg-gray-300', completed: false },
]

export default function StartupSection({ onApplyNow }: StartupSectionProps) {
  return (
    <section className="py-20 lg:py-28 bg-kunfa-light-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Content */}
          <div>
            <span className="badge-green mb-4 inline-flex">
              🚀 For Startups
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-kunfa-navy mt-4 mb-4">
              Get discovered by 500+ verified investors
            </h2>
            <p className="text-kunfa-text-secondary text-lg mb-8 leading-relaxed">
              Upload your deck, get scored by our AI, and gain instant visibility in our investor
              network. No warm intros needed — let your metrics speak for themselves.
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
            <button
              onClick={onApplyNow}
              className="btn-primary inline-flex items-center gap-2"
            >
              Apply Now
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>

          {/* Right — Profile Completion Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-kunfa-navy">Profile Completion</h3>
              <span className="text-3xl font-bold text-kunfa-green">78%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-8">
              <div className="bg-kunfa-green h-2 rounded-full transition-all duration-500" style={{ width: '78%' }} />
            </div>

            <div className="space-y-4">
              {profileItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="font-medium text-kunfa-navy">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-kunfa-text-secondary">{item.points}</span>
                    {item.completed ? (
                      <svg className="w-5 h-5 text-kunfa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
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
