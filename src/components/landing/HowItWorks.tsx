const steps = [
  {
    number: '01',
    title: 'Upload Your Deck',
    description: 'Submit your pitch deck and optional financials. Our system supports PDF, PPT, and Keynote formats.',
    icon: (
      <svg className="w-7 h-7 text-kunfa" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Get AI-Scored',
    description: 'Our AI analyzes your team, market, product, traction, and financials across 6 dimensions with stage-adjusted weights.',
    icon: (
      <svg className="w-7 h-7 text-kunfa" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Connect with Investors',
    description: 'Your company profile goes live in our marketplace. Verified investors discover, watchlist, and add you to their pipeline.',
    icon: (
      <svg className="w-7 h-7 text-kunfa" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-kunfa-navy mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Three steps from pitch deck to investor pipeline
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gray-200" />
              )}

              <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center relative">
                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-5">
                  {step.icon}
                </div>
                <span className="text-xs font-bold text-kunfa tracking-widest uppercase mb-2 block">
                  Step {step.number}
                </span>
                <h3 className="text-lg font-bold text-kunfa-navy mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
