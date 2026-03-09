'use client'

import TeaserScore from '@/components/scoring/TeaserScore'
import KunfaLogo from '@/components/common/KunfaLogo'

const demoResult = {
  overall_score: 74,
  percentile: 32,
  summary: 'TechFlow AI demonstrates strong product-market fit in the rapidly growing AI infrastructure space. The founding team brings relevant experience from major tech companies, though the financial projections could benefit from more conservative scenario modeling. The market opportunity is substantial with clear tailwinds.',
  investment_readiness: 'Almost Ready',
  dimensions: {
    team: {
      score: 20,
      letter_grade: 'B+',
      headline: 'Experienced founders with complementary skill sets and strong domain expertise',
    },
    market: {
      score: 21,
      letter_grade: 'A-',
      headline: 'Large and growing market with clear adoption tailwinds and limited competition',
    },
    product: {
      score: 18,
      letter_grade: 'B',
      headline: 'Solid technical foundation with clear differentiation, early PMF signals',
    },
    financial: {
      score: 15,
      letter_grade: 'B-',
      headline: 'Healthy growth trajectory but unit economics need refinement',
    },
  },
}

export default function DemoPage() {
  const handleUnlock = () => {
    alert('This is a demo. In the real flow, this would redirect to Stripe Checkout for $59.')
  }

  return (
    <div className="min-h-screen bg-kunfa-light-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full">
        {/* Header */}
        <div className="bg-kunfa-navy rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <KunfaLogo height={24} inverted />
          <span className="text-xs font-semibold text-kunfa-yellow bg-kunfa-yellow/10 px-3 py-1 rounded-full">
            DEMO
          </span>
        </div>

        <div className="p-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 m-4 mb-0">
            <p className="text-xs text-yellow-700">
              <strong>Demo Mode:</strong> This is a sample score for a fictional startup &quot;TechFlow AI&quot;.
              <a href="/" className="text-kunfa font-semibold ml-1 hover:underline">Get your real score &rarr;</a>
            </p>
          </div>
        </div>

        <TeaserScore
          result={demoResult}
          submissionId="demo"
          onUnlock={handleUnlock}
        />
      </div>
    </div>
  )
}
