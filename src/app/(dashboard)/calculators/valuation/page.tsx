'use client';

import { ValuationCalculator } from '@/components/calculators/ValuationCalculator';

export default function ValuationCalculatorPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Valuation Calculator</h1>
        <p className="text-gray-600 mt-2">
          Compare company valuations using DCF, Comps, and Venture Capital methods
        </p>
      </div>

      {/* Calculator */}
      <ValuationCalculator />
    </div>
  );
}
