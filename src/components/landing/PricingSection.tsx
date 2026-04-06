'use client'

interface PricingSectionProps {
  onApplyNow: () => void
}

const plans = [
  {
    name: 'Kunfa Score',
    price: 'Free',
    subtitle: 'Get started instantly',
    features: [
      'AI-powered scoring across 6 dimensions',
      'Public company profile page',
      'Visibility to verified investors',
      'Stage-adjusted analysis',
    ],
    buttonText: 'Get Your Score',
    buttonStyle: 'bg-kunfa hover:bg-kunfa-dark text-white',
    cardStyle: 'bg-white border-2 border-kunfa',
    popular: false,
    action: 'score',
  },
  {
    name: 'Readiness Report',
    price: '$59',
    subtitle: 'One-time purchase',
    features: [
      'Everything in Free',
      'Full investment readiness report',
      'Actionable improvement plan',
      'Sector benchmarks & comparisons',
      'Financial model feedback',
    ],
    buttonText: 'Get Full Report',
    buttonStyle: 'bg-kunfa-navy hover:bg-gray-800 text-white',
    cardStyle: 'bg-white border-2 border-kunfa-navy',
    popular: true,
    action: 'score',
  },
  {
    name: 'Enterprise',
    price: 'Launching Soon',
    subtitle: 'For funds & accelerators',
    features: [
      'Everything in Readiness Report',
      'Full deal pipeline & CRM',
      'Team collaboration tools',
      'Batch scoring for portfolios',
      'API access',
    ],
    buttonText: 'Contact Us',
    buttonStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    cardStyle: 'bg-white border border-gray-200',
    popular: false,
    action: 'contact',
  },
]

export default function PricingSection({ onApplyNow }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-kunfa-navy mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-gray-600 text-base max-w-xl mx-auto mb-12">
          Start free. Upgrade when you need deeper insights.
        </p>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 ${plan.cardStyle} flex flex-col`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-kunfa-navy text-white text-xs font-bold px-4 py-1 rounded-full uppercase">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-bold text-kunfa-navy mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold text-kunfa-navy mb-1">{plan.price}</p>
              <p className="text-sm text-gray-500 mb-8">{plan.subtitle}</p>

              <ul className="space-y-3 mb-8 flex-1 text-left">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-kunfa shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (plan.action === 'contact') {
                    window.location.href = 'mailto:invest@kunfa.ai'
                  } else {
                    onApplyNow()
                  }
                }}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${plan.buttonStyle}`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
