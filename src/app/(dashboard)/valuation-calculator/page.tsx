'use client'

import FeatureGate from '@/components/common/FeatureGate'
import { Calculator } from 'lucide-react'

export default function ValuationCalculatorPage() {
  return (
    <FeatureGate feature="valuation_calculator">
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#007CF8]/10 flex items-center justify-center mx-auto mb-6">
          <Calculator className="w-8 h-8 text-[#007CF8]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">AI Valuation Calculator</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Multi-method valuation with DCF, comparable companies, revenue multiples, and AI-recommended approach. Coming soon.
        </p>
      </div>
    </FeatureGate>
  )
}
