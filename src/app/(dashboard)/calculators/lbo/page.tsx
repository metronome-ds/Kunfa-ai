'use client';

import { LBOCalculator } from '@/components/calculators/LBOCalculator';

export default function LBOCalculatorPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--ink)]">LBO Calculator</h1>
        <p className="text-[var(--ink-soft)] mt-2">
          Model leveraged buyout transactions and analyze return metrics
        </p>
      </div>

      {/* Calculator */}
      <LBOCalculator />
    </div>
  );
}
