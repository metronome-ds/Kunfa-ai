'use client';

import { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import {
  calculateDCF,
  calculateComps,
  calculateVCMethod,
  type DCFInputs,
  type CompsInputs,
  type VCMethodInputs,
} from '@/lib/calculators';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

export function ValuationCalculator() {
  const [selectedTab, setSelectedTab] = useState<'dcf' | 'comps' | 'vc'>('dcf');

  // DCF State
  const [dcfInputs, setDCFInputs] = useState<DCFInputs>({
    projectedCashFlows: [5000000, 6000000, 7200000, 8640000, 10368000],
    discountRate: 12,
    terminalGrowthRate: 3,
  });
  const [dcfResult, setDCFResult] = useState(calculateDCF(dcfInputs));

  // Comps State
  const [compsInputs, setCompsInputs] = useState<CompsInputs>({
    revenue: 20000000,
    ebitda: 5000000,
    evRevenueMultiple: 5,
    evEbitdaMultiple: 10,
  });
  const [compsResult, setCompsResult] = useState(calculateComps(compsInputs));

  // VC Method State
  const [vcInputs, setVCInputs] = useState<VCMethodInputs>({
    expectedExitValue: 500000000,
    targetReturnMultiple: 10,
    timeToExitYears: 7,
  });
  const [vcResult, setVCResult] = useState(calculateVCMethod(vcInputs));

  // DCF Handlers
  const handleDCFCashFlowChange = (index: number, value: number) => {
    const newFlows = [...dcfInputs.projectedCashFlows];
    newFlows[index] = value;
    const newInputs = { ...dcfInputs, projectedCashFlows: newFlows };
    setDCFInputs(newInputs);
    setDCFResult(calculateDCF(newInputs));
  };

  const handleDCFInputChange = (key: 'discountRate' | 'terminalGrowthRate', value: number) => {
    const newInputs = { ...dcfInputs, [key]: value };
    setDCFInputs(newInputs);
    setDCFResult(calculateDCF(newInputs));
  };

  // Comps Handlers
  const handleCompsInputChange = (key: keyof CompsInputs, value: number) => {
    const newInputs = { ...compsInputs, [key]: value };
    setCompsInputs(newInputs);
    setCompsResult(calculateComps(newInputs));
  };

  // VC Method Handlers
  const handleVCInputChange = (key: keyof VCMethodInputs, value: number) => {
    const newInputs = { ...vcInputs, [key]: value };
    setVCInputs(newInputs);
    setVCResult(calculateVCMethod(newInputs));
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedTab('dcf')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            selectedTab === 'dcf'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          DCF Method
        </button>
        <button
          onClick={() => setSelectedTab('comps')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            selectedTab === 'comps'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Comps Method
        </button>
        <button
          onClick={() => setSelectedTab('vc')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            selectedTab === 'vc'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          VC Method
        </button>
      </div>

      {/* DCF Tab */}
      {selectedTab === 'dcf' && (
        <div className="space-y-6">
          <Card title="DCF Valuation Inputs" subtitle="Project cash flows and set discount rate">
            <div className="space-y-6">
              {/* Cash Flows */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Projected Cash Flows (5 Years)</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {dcfInputs.projectedCashFlows.map((cf, idx) => (
                    <div key={idx} className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Year {idx + 1}</label>
                      <Input
                        type="number"
                        value={cf}
                        onChange={(e) => handleDCFCashFlowChange(idx, parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">{formatCurrency(cf)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Rate and Terminal Growth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Discount Rate (WACC) %</label>
                  <Input
                    type="number"
                    value={dcfInputs.discountRate}
                    onChange={(e) => handleDCFInputChange('discountRate', parseFloat(e.target.value))}
                    className="w-full"
                    step="0.5"
                  />
                  <p className="text-xs text-gray-500">Typical range: 8-15%</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Terminal Growth Rate %</label>
                  <Input
                    type="number"
                    value={dcfInputs.terminalGrowthRate}
                    onChange={(e) => handleDCFInputChange('terminalGrowthRate', parseFloat(e.target.value))}
                    className="w-full"
                    step="0.5"
                  />
                  <p className="text-xs text-gray-500">Typical range: 2-4%</p>
                </div>
              </div>
            </div>
          </Card>

          {/* DCF Results */}
          <Card title="DCF Valuation Results">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">PV of Cash Flows</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(dcfResult.sumPVCashFlows)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Years 1-5</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Terminal Value</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(dcfResult.terminalValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Undiscounted</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">PV of Terminal Value</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(dcfResult.pvTerminalValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Discounted to today</p>
                </div>
              </div>

              {/* Enterprise Value */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">Enterprise Value</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {formatCurrency(dcfResult.enterpriseValue)}
                </p>
              </div>

              {/* PV Waterfall */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">PV Waterfall</h4>
                <div className="space-y-2">
                  {dcfResult.pvCashFlows.map((pv, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">
                        Year {idx + 1} PV (Discount Factor: {((1 / Math.pow(1 + dcfInputs.discountRate / 100, idx + 1)) * 100).toFixed(1)}%)
                      </span>
                      <span className="font-medium text-gray-900">{formatCurrency(pv)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 px-4 bg-blue-50 rounded border border-blue-200 mt-4">
                    <span className="text-sm font-medium text-blue-900">Total PV of Cash Flows</span>
                    <span className="font-bold text-blue-600">{formatCurrency(dcfResult.sumPVCashFlows)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-4 bg-green-50 rounded border border-green-200">
                    <span className="text-sm font-medium text-green-900">PV of Terminal Value</span>
                    <span className="font-bold text-green-600">{formatCurrency(dcfResult.pvTerminalValue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Comps Tab */}
      {selectedTab === 'comps' && (
        <div className="space-y-6">
          <Card title="Comparable Companies (Comps) Inputs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Revenue</label>
                <Input
                  type="number"
                  value={compsInputs.revenue}
                  onChange={(e) => handleCompsInputChange('revenue', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(compsInputs.revenue)}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">EBITDA</label>
                <Input
                  type="number"
                  value={compsInputs.ebitda}
                  onChange={(e) => handleCompsInputChange('ebitda', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(compsInputs.ebitda)}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">EV/Revenue Multiple</label>
                <Input
                  type="number"
                  value={compsInputs.evRevenueMultiple}
                  onChange={(e) => handleCompsInputChange('evRevenueMultiple', parseFloat(e.target.value))}
                  className="w-full"
                  step="0.5"
                />
                <p className="text-xs text-gray-500 mt-1">Industry comparable</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">EV/EBITDA Multiple</label>
                <Input
                  type="number"
                  value={compsInputs.evEbitdaMultiple}
                  onChange={(e) => handleCompsInputChange('evEbitdaMultiple', parseFloat(e.target.value))}
                  className="w-full"
                  step="0.5"
                />
                <p className="text-xs text-gray-500 mt-1">Industry comparable</p>
              </div>
            </div>
          </Card>

          {/* Comps Results */}
          <Card title="Valuation by Comparable Companies">
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-900">Valuation by Revenue</p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="text-xs text-purple-700">
                      {formatCurrency(compsInputs.revenue)} × {compsInputs.evRevenueMultiple}x
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatCurrency(compsResult.valuationByRevenue)}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">Valuation by EBITDA</p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="text-xs text-blue-700">
                      {formatCurrency(compsInputs.ebitda)} × {compsInputs.evEbitdaMultiple}x
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(compsResult.valuationByEBITDA)}
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900">Average Valuation</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {formatCurrency(compsResult.averageValuation)}
                </p>
                <p className="text-xs text-green-700 mt-2">Simple average of both methods</p>
              </div>

              {/* Valuation Range */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Valuation Range</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Minimum</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(Math.min(compsResult.valuationByRevenue, compsResult.valuationByEBITDA))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Average</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(compsResult.averageValuation)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Maximum</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(Math.max(compsResult.valuationByRevenue, compsResult.valuationByEBITDA))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VC Method Tab */}
      {selectedTab === 'vc' && (
        <div className="space-y-6">
          <Card title="Venture Capital Method Inputs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Expected Exit Value</label>
                <Input
                  type="number"
                  value={vcInputs.expectedExitValue}
                  onChange={(e) => handleVCInputChange('expectedExitValue', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(vcInputs.expectedExitValue)}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Target Return Multiple</label>
                <Input
                  type="number"
                  value={vcInputs.targetReturnMultiple}
                  onChange={(e) => handleVCInputChange('targetReturnMultiple', parseFloat(e.target.value))}
                  className="w-full"
                  step="1"
                />
                <p className="text-xs text-gray-500 mt-1">e.g., 10x, 5x</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Time to Exit (Years)</label>
                <Input
                  type="number"
                  value={vcInputs.timeToExitYears}
                  onChange={(e) => handleVCInputChange('timeToExitYears', parseFloat(e.target.value))}
                  className="w-full"
                  min="1"
                  max="15"
                  step="1"
                />
              </div>
            </div>
          </Card>

          {/* VC Method Results */}
          <Card title="Valuation & Investment Terms">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900">Pre-Money Valuation</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {formatCurrency(vcResult.preMoneyValuation)}
                  </p>
                  <p className="text-xs text-blue-700 mt-2">Company value before investment</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900">Post-Money Valuation</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {formatCurrency(vcResult.postMoneyValuation)}
                  </p>
                  <p className="text-xs text-green-700 mt-2">Company value after investment</p>
                </div>
              </div>

              {/* Investment Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Investment Terms</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">Required Funding Amount</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(vcResult.requiredFundingAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-200 pt-2">
                    <span className="text-sm text-gray-700">Investor Equity Stake</span>
                    <span className="font-medium text-gray-900">{formatPercentage(vcResult.equityStake)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">Founder Dilution</span>
                    <span className="font-medium text-gray-900">
                      {formatPercentage(100 - vcResult.equityStake)}
                    </span>
                  </div>
                </div>
              </div>

              {/* VC Method Calculation Explanation */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900 mb-3">How It Works</p>
                <div className="text-xs text-amber-800 space-y-2">
                  <p>
                    Post-Money Valuation = Expected Exit Value ÷ Target Return Multiple
                  </p>
                  <p>
                    Post-Money = {formatCurrency(vcInputs.expectedExitValue)} ÷ {vcInputs.targetReturnMultiple}x = {formatCurrency(vcResult.postMoneyValuation)}
                  </p>
                  <p className="pt-2">
                    Assuming typical {formatPercentage(vcResult.equityStake)} investor stake in early-stage rounds
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Summary Comparison */}
      <Card title="Valuation Summary" subtitle="Compare valuations across all methods">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs font-medium text-purple-700 uppercase">DCF Valuation</p>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {formatCurrency(dcfResult.enterpriseValue)}
            </p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-medium text-green-700 uppercase">Comps Valuation</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrency(compsResult.averageValuation)}
            </p>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-medium text-blue-700 uppercase">Post-Money (VC)</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {formatCurrency(vcResult.postMoneyValuation)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
