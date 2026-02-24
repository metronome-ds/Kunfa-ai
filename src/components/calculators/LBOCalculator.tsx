'use client';

import { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { calculateLBO, calculateSensitivityAnalysis, type LBOInputs, type SensitivityResult } from '@/lib/calculators';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import { Copy, Download } from 'lucide-react';

const DEFAULT_LBO_INPUTS: LBOInputs = {
  purchasePrice: 100000000,
  equityPercentage: 40,
  debtPercentage: 60,
  interestRate: 5.5,
  holdPeriodYears: 5,
  exitMultiple: 6,
  revenue: 50000000,
  ebitdaMargin: 25,
  revenueGrowthRate: 12,
};

export function LBOCalculator() {
  const [inputs, setInputs] = useState<LBOInputs>(DEFAULT_LBO_INPUTS);
  const [result, setResult] = useState(calculateLBO(inputs));
  const [sensitivityData, setSensitivityData] = useState<SensitivityResult[]>(calculateSensitivityAnalysis(inputs));
  const [copied, setCopied] = useState(false);

  const handleInputChange = (key: keyof LBOInputs, value: number) => {
    const newInputs = { ...inputs, [key]: value };
    setInputs(newInputs);
    const newResult = calculateLBO(newInputs);
    setResult(newResult);
    setSensitivityData(calculateSensitivityAnalysis(newInputs));
  };

  const handleCopyResults = () => {
    const resultsText = `
LBO Model Results
=================
Purchase Price: ${formatCurrency(inputs.purchasePrice)}
Equity Invested: ${formatCurrency(result.equityInvested)}
Total Debt: ${formatCurrency(result.totalDebt)}
Annual EBITDA: ${formatCurrency(result.annualEBITDA)}

Exit Results (Year ${inputs.holdPeriodYears}):
Exit Enterprise Value: ${formatCurrency(result.exitEnterpriseValue)}
Exit Equity Value: ${formatCurrency(result.exitEquityValue)}
Ending Debt: ${formatCurrency(result.debtSchedule[result.debtSchedule.length - 1].endingDebt)}

Returns:
MOIC: ${result.moic.toFixed(2)}x
IRR: ${formatPercentage(result.irr)}
    `.trim();

    navigator.clipboard.writeText(resultsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getColorForMOIC = (moic: number) => {
    if (moic >= 3) return 'text-green-600';
    if (moic >= 2) return 'text-blue-600';
    if (moic >= 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getColorForIRR = (irr: number) => {
    if (irr >= 30) return 'text-green-600';
    if (irr >= 20) return 'text-blue-600';
    if (irr >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Inputs Section */}
      <Card title="LBO Model Inputs" subtitle="Configure purchase price, capital structure, and growth assumptions">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Capital Structure */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
            <Input
              type="number"
              value={inputs.purchasePrice}
              onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(inputs.purchasePrice)}</p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Equity %</label>
            <Input
              type="number"
              value={inputs.equityPercentage}
              onChange={(e) => handleInputChange('equityPercentage', parseFloat(e.target.value))}
              className="w-full"
              min="0"
              max="100"
              step="5"
            />
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(inputs.purchasePrice * (inputs.equityPercentage / 100))}</p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Debt %</label>
            <Input
              type="number"
              value={inputs.debtPercentage}
              onChange={(e) => handleInputChange('debtPercentage', parseFloat(e.target.value))}
              className="w-full"
              min="0"
              max="100"
              step="5"
            />
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(inputs.purchasePrice * (inputs.debtPercentage / 100))}</p>
          </div>

          {/* Debt Terms */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Interest Rate (%)</label>
            <Input
              type="number"
              value={inputs.interestRate}
              onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value))}
              className="w-full"
              step="0.25"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Hold Period (Years)</label>
            <Input
              type="number"
              value={inputs.holdPeriodYears}
              onChange={(e) => handleInputChange('holdPeriodYears', parseFloat(e.target.value))}
              className="w-full"
              min="1"
              max="10"
              step="1"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Exit Multiple (EV/EBITDA)</label>
            <Input
              type="number"
              value={inputs.exitMultiple}
              onChange={(e) => handleInputChange('exitMultiple', parseFloat(e.target.value))}
              className="w-full"
              step="0.5"
            />
          </div>

          {/* Revenue Assumptions */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Revenue ($)</label>
            <Input
              type="number"
              value={inputs.revenue}
              onChange={(e) => handleInputChange('revenue', parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(inputs.revenue)}</p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">EBITDA Margin (%)</label>
            <Input
              type="number"
              value={inputs.ebitdaMargin}
              onChange={(e) => handleInputChange('ebitdaMargin', parseFloat(e.target.value))}
              className="w-full"
              min="0"
              max="100"
              step="1"
            />
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(inputs.revenue * (inputs.ebitdaMargin / 100))}</p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Revenue Growth Rate (%)</label>
            <Input
              type="number"
              value={inputs.revenueGrowthRate}
              onChange={(e) => handleInputChange('revenueGrowthRate', parseFloat(e.target.value))}
              className="w-full"
              step="1"
            />
          </div>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div>
            <p className="text-sm font-medium text-gray-600">Equity Invested</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(result.equityInvested)}</p>
            <p className="text-xs text-gray-500 mt-1">{formatPercentage(inputs.equityPercentage)}</p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Debt</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(result.totalDebt)}</p>
            <p className="text-xs text-gray-500 mt-1">{formatPercentage(inputs.debtPercentage)}</p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm font-medium text-gray-600">Exit Equity Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(result.exitEquityValue)}</p>
            <p className="text-xs text-gray-500 mt-1">Year {inputs.holdPeriodYears}</p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm font-medium text-gray-600">Annual EBITDA</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(result.annualEBITDA)}</p>
            <p className="text-xs text-gray-500 mt-1">{formatPercentage(inputs.ebitdaMargin)} margin</p>
          </div>
        </Card>
      </div>

      {/* Key Metrics */}
      <Card title="Key Returns" action={<Button variant="ghost" size="sm" onClick={handleCopyResults}><Copy className="h-4 w-4 mr-2" />{copied ? 'Copied!' : 'Copy'}</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600">MOIC</p>
            <p className={cn('text-3xl font-bold mt-2', getColorForMOIC(result.moic))}>{result.moic.toFixed(2)}x</p>
            <p className="text-xs text-gray-500 mt-1">Money-on-Money Multiple</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600">IRR</p>
            <p className={cn('text-3xl font-bold mt-2', getColorForIRR(result.irr))}>{formatPercentage(result.irr)}</p>
            <p className="text-xs text-gray-500 mt-1">Internal Rate of Return</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600">Ending Debt</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(result.debtSchedule[result.debtSchedule.length - 1].endingDebt)}</p>
            <p className="text-xs text-gray-500 mt-1">At exit (Year {inputs.holdPeriodYears})</p>
          </div>
        </div>
      </Card>

      {/* Debt Schedule */}
      <Card title="Annual Debt Schedule" subtitle="Year-by-year breakdown of debt paydown">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Year</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Beginning Debt</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">EBITDA</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Interest</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Debt Paydown</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Ending Debt</th>
              </tr>
            </thead>
            <tbody>
              {result.debtSchedule.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="py-2 px-4 text-gray-900">{item.year}</td>
                  <td className="text-right py-2 px-4 text-gray-900">{formatCurrency(item.beginningDebt)}</td>
                  <td className="text-right py-2 px-4 text-gray-900">{formatCurrency(item.ebitda)}</td>
                  <td className="text-right py-2 px-4 text-gray-900">{formatCurrency(item.interestExpense)}</td>
                  <td className="text-right py-2 px-4 text-green-600 font-medium">{formatCurrency(item.debtPaydown)}</td>
                  <td className="text-right py-2 px-4 text-gray-900 font-medium">{formatCurrency(item.endingDebt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sensitivity Analysis */}
      <Card title="Sensitivity Analysis" subtitle="MOIC sensitivity to exit multiple and growth rate">
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-4 font-semibold text-gray-700">Growth / Exit</th>
                  <th className="text-center py-2 px-4 font-semibold text-gray-700">4.0x</th>
                  <th className="text-center py-2 px-4 font-semibold text-gray-700">5.0x</th>
                  <th className="text-center py-2 px-4 font-semibold text-gray-700">6.0x</th>
                  <th className="text-center py-2 px-4 font-semibold text-gray-700">7.0x</th>
                  <th className="text-center py-2 px-4 font-semibold text-gray-700">8.0x</th>
                </tr>
              </thead>
              <tbody>
                {[5, 10, 15, 20, 25].map((growthRate) => (
                  <tr key={growthRate} className="border-b border-gray-200">
                    <td className="py-2 px-4 font-medium text-gray-900">{growthRate}%</td>
                    {[4, 5, 6, 7, 8].map((exitMult) => {
                      const data = sensitivityData.find((d) => d.growthRate === growthRate && d.exitMultiple === exitMult);
                      const moic = data?.moic || 0;
                      let bgColor = 'bg-red-50 text-red-700';
                      if (moic >= 3) bgColor = 'bg-green-50 text-green-700';
                      else if (moic >= 2) bgColor = 'bg-blue-50 text-blue-700';
                      else if (moic >= 1.5) bgColor = 'bg-yellow-50 text-yellow-700';

                      return (
                        <td key={`${growthRate}-${exitMult}`} className={`text-center py-2 px-4 font-medium ${bgColor}`}>
                          {moic.toFixed(2)}x
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">Color coding: Green (3.0x+), Blue (2.0x+), Yellow (1.5x+), Red (below 1.5x)</p>
        </div>
      </Card>
    </div>
  );
}
