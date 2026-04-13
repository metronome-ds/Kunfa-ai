'use client'

import Link from 'next/link'

const highlights = [
  {
    icon: '📋',
    title: 'Shariah Compliance',
    description: 'Full Shariah review and certification by qualified scholars.',
  },
  {
    icon: '💰',
    title: 'Financial Modeling',
    description: 'Investor-grade models with projections and unit economics.',
  },
  {
    icon: '🎯',
    title: 'Fundraise Strategy',
    description: 'Pitch deck, data room, and investor targeting support.',
  },
  {
    icon: '⚖️',
    title: 'Legal & Governance',
    description: 'Term sheets, corporate governance, and cap table setup.',
  },
]

export default function ExpertServicesSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#F8F9FB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold text-[#007CF8] uppercase tracking-wider mb-3">
          Expert Services
        </p>
        <h2 className="text-2xl lg:text-3xl font-bold text-kunfa-navy mb-4">
          Get hands-on help from vetted experts
        </h2>
        <p className="text-gray-600 text-base max-w-2xl mx-auto mb-12">
          From Shariah compliance to financial modeling, our managed services connect you with pre-vetted professionals who understand GCC founders.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-[#007CF8]/40 hover:shadow-md transition-all"
            >
              <span className="text-2xl mb-3 block">{item.icon}</span>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <Link
          href="/services"
          className="inline-flex items-center gap-2 bg-kunfa hover:bg-kunfa-dark text-white font-semibold text-sm px-8 py-3 rounded-lg transition-colors"
        >
          Browse All Services
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </section>
  )
}
