'use client'

interface PricingSectionProps {
  onApplyNow: () => void
}

const plans = [
  {
    name: 'Free',
    label: 'For Startups',
    labelColor: 'text-kunfa-green',
    price: 'Free',
    subtitle: 'Get your Kunfa Score',
    features: [
      'AI-powered scoring',
      'Profile creation',
      'Investor discovery',
      'Data room basics',
    ],
    buttonText: 'Apply Now',
    buttonStyle: 'border-2 border-kunfa-green text-kunfa-green hover:bg-emerald-50',
    cardStyle: 'bg-white border border-gray-200',
    popular: false,
    dark: false,
  },
  {
    name: '$59',
    label: 'Investment Memo',
    labelColor: 'text-kunfa-indigo',
    price: '$59',
    subtitle: 'One-time purchase',
    features: [
      '15+ page analysis',
      'Actionable improvements',
      'Sector benchmarks',
      'Deck recommendations',
      'Financial feedback',
    ],
    buttonText: 'Get Memo',
    buttonStyle: 'bg-kunfa-indigo hover:bg-indigo-600 text-white',
    cardStyle: 'bg-white border-2 border-kunfa-indigo',
    popular: true,
    dark: false,
  },
  {
    name: 'Custom',
    label: 'For Investors',
    labelColor: 'text-kunfa-orange',
    price: 'Custom',
    subtitle: 'Contact for pricing',
    features: [
      'Full deal pipeline',
      'AI scoring engine',
      'Team collaboration',
      'LP dashboards',
      'API access',
    ],
    buttonText: 'Contact Sales',
    buttonStyle: 'border-2 border-white text-white hover:bg-white/10',
    cardStyle: 'bg-kunfa-navy text-white',
    popular: false,
    dark: true,
  },
]

export default function PricingSection({ onApplyNow }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-kunfa-navy mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-kunfa-text-secondary text-lg max-w-xl mx-auto mb-12">
          Get started for free. Only pay when you need more.
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
                  <span className="bg-kunfa-yellow text-kunfa-navy text-xs font-bold px-4 py-1 rounded-full uppercase">
                    Popular
                  </span>
                </div>
              )}

              <p className={`text-sm font-semibold mb-2 ${plan.labelColor}`}>{plan.label}</p>
              <h3 className={`text-4xl font-bold mb-2 ${plan.dark ? 'text-white' : 'text-kunfa-navy'}`}>
                {plan.price}
              </h3>
              <p className={`text-sm mb-8 ${plan.dark ? 'text-gray-400' : 'text-kunfa-text-secondary'}`}>
                {plan.subtitle}
              </p>

              <ul className="space-y-3 mb-8 flex-1 text-left">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-kunfa-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={`text-sm ${plan.dark ? 'text-gray-300' : 'text-kunfa-text-secondary'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (plan.name === 'Free') {
                    onApplyNow()
                  } else if (plan.name === 'Custom') {
                    window.location.href = 'mailto:hello@vitality.capital'
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
