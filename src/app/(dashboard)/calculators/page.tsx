'use client';

import Link from 'next/link';
import { Card } from '@/components/common/Card';
import { BarChart3, TrendingUp, CheckSquare } from 'lucide-react';

export default function CalculatorsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Calculators</h1>
        <p className="text-gray-600 mt-2">
          Powerful tools for analyzing investments, valuations, and due diligence
        </p>
      </div>

      {/* Calculator Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LBO Calculator */}
        <Link href="/calculators/lbo">
          <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">LBO Calculator</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Leveraged Buyout analysis
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 flex-1">
                Model purchase transactions with debt/equity structures. Calculate MOIC, IRR, and debt paydown schedules.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-gray-500">
                <li>✓ Capital structure modeling</li>
                <li>✓ Debt schedule & paydown</li>
                <li>✓ Return metrics (MOIC/IRR)</li>
                <li>✓ Sensitivity analysis</li>
              </ul>
            </div>
          </Card>
        </Link>

        {/* Valuation Calculator */}
        <Link href="/calculators/valuation">
          <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Valuation</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Company valuation methods
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 flex-1">
                Compare three valuation methods: DCF, Comparable Companies, and Venture Capital method.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-gray-500">
                <li>✓ DCF analysis</li>
                <li>✓ Comps multiples</li>
                <li>✓ VC method</li>
                <li>✓ Valuation comparison</li>
              </ul>
            </div>
          </Card>
        </Link>

        {/* DD Checklist */}
        <Link href="/calculators/dd-checklist">
          <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">DD Checklist</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Due diligence tracking
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CheckSquare className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 flex-1">
                Comprehensive due diligence checklist covering Financial, Legal, Operational, Commercial, and Technical areas.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-gray-500">
                <li>✓ 5 DD categories</li>
                <li>✓ 40+ checklist items</li>
                <li>✓ Progress tracking</li>
                <li>✓ Priority filtering</li>
              </ul>
            </div>
          </Card>
        </Link>
      </div>

      {/* Info Section */}
      <Card title="How to Use These Tools" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">LBO Calculator</h4>
            <p className="text-sm text-gray-600">
              Input purchase price, debt/equity split, interest rates, and growth assumptions to model leveraged buyout transactions. Instantly see MOIC, IRR, and debt paydown schedules.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Valuation Tools</h4>
            <p className="text-sm text-gray-600">
              Compare company valuations using three methods: Discounted Cash Flow (DCF) for intrinsic value, Comparable Companies for market multiples, and the Venture Capital method for early-stage investments.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">DD Checklist</h4>
            <p className="text-sm text-gray-600">
              Track due diligence progress across 5 categories: Financial, Legal, Operational, Commercial, and Technical. Filter by priority and expand items for detailed guidance.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
