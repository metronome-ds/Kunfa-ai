const providers = [
  {
    name: 'Silicon Valley Bank',
    type: 'Venture Debt',
    typeColor: 'text-blue-600 bg-blue-50',
    capacity: '$50M — $500M',
    focus: 'Tech / Life Sciences',
    icon: '🏦',
  },
  {
    name: 'Hercules Capital',
    type: 'Growth Lending',
    typeColor: 'text-purple-600 bg-purple-50',
    capacity: '$10M — $150M',
    focus: 'Healthcare / Enterprise',
    icon: '🏛️',
  },
  {
    name: 'Trinity Capital',
    type: 'Equipment Finance',
    typeColor: 'text-emerald-600 bg-emerald-50',
    capacity: '$5M — $50M',
    focus: 'Hardware / Biotech',
    icon: '⚡',
  },
]

export default function DebtProviderSection() {
  return (
    <section className="py-20 lg:py-28 bg-kunfa-light-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="badge-green mb-4 inline-flex">
          🏛️ Debt Provider Network
        </span>
        <h2 className="text-3xl lg:text-4xl font-bold text-kunfa-navy mt-4 mb-4">
          Join our growing lender network
        </h2>
        <p className="text-kunfa-text-secondary text-lg max-w-2xl mx-auto mb-12">
          Connect with pre-vetted, high-growth startups looking for venture debt, growth
          lending, and equipment financing. AI-matched to your lending criteria.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {providers.map((provider) => (
            <div key={provider.name} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow text-left">
              <div className="text-3xl mb-4">{provider.icon}</div>
              <h3 className="text-lg font-bold text-kunfa-navy mb-2">{provider.name}</h3>
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${provider.typeColor}`}>
                {provider.type}
              </span>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-kunfa-text-secondary">Capacity</span>
                  <span className="font-medium text-kunfa-navy">{provider.capacity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-kunfa-text-secondary">Focus</span>
                  <span className="font-medium text-kunfa-navy">{provider.focus}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <a
          href="mailto:invest@kunfa.ai"
          className="inline-flex items-center gap-2 bg-kunfa-orange hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Register as Provider
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </section>
  )
}
