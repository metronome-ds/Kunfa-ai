'use client'

import Link from 'next/link'

interface HeroProps {
  onApplyNow: () => void
}

export default function Hero({ onApplyNow }: HeroProps) {
  return (
    <section className="bg-white pt-20 pb-24 lg:pt-28 lg:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Now live in the GCC
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight max-w-4xl mx-auto mb-6">
          <span className="text-kunfa-navy">AI-Powered Venture Intelligence</span>
          <br />
          <span className="text-gradient-green">for the GCC</span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-600 text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Get scored. Get discovered. Get funded.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onApplyNow}
            className="bg-kunfa-green hover:bg-kunfa-green-dark text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-colors shadow-sm"
          >
            Get Your Kunfa Score
          </button>
          <Link
            href="/signup"
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-8 py-3.5 rounded-lg text-base transition-colors"
          >
            I&apos;m an Investor
          </Link>
        </div>

        {/* Trust bar */}
        <p className="text-gray-400 text-sm mt-10">
          Free AI score &middot; Full readiness report for $59 &middot; No credit card required
        </p>
      </div>
    </section>
  )
}
