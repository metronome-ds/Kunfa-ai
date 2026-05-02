'use client'

import Link from 'next/link'

interface HeroProps {
  onApplyNow: () => void
}

export default function Hero({ onApplyNow }: HeroProps) {
  return (
    <section className="bg-[var(--bg-elev)] pt-20 pb-24 lg:pt-28 lg:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight max-w-4xl mx-auto mb-6">
          <span className="text-kunfa-navy">The AI-native platform</span>
          <br />
          <span className="text-gradient-green">for venture intelligence</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[var(--ink-soft)] text-base lg:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Faster deals, smarter capital, built-in compliance.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onApplyNow}
            className="bg-kunfa hover:bg-kunfa-dark text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-colors"
          >
            Get Your Kunfa Score
          </button>
          <Link
            href="/signup"
            className="border border-[var(--line-strong)] text-[var(--ink-soft)] hover:bg-[#F8F9FB] font-semibold px-8 py-3.5 rounded-lg text-base transition-colors"
          >
            I&apos;m an Investor
          </Link>
        </div>

        {/* Trust bar */}
        <p className="text-[var(--ink-faint)] text-xs mt-10">
          Free AI score &middot; Full readiness report for $59 &middot; No credit card required
        </p>
      </div>
    </section>
  )
}
