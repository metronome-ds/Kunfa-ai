'use client';

import { useState } from 'react';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { TermSheetAnalysis } from '@/lib/types';

interface TermSheetAnalyzerProps {
  dealId: string;
  documentId?: string;
  analysis?: Partial<TermSheetAnalysis>;
}

function TermBadge({ status }: { status: 'standard' | 'favorable' | 'unfavorable' }) {
  const colors = {
    standard: 'bg-gray-100 text-gray-800 border-gray-300',
    favorable: 'bg-green-100 text-green-800 border-green-300',
    unfavorable: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function TermSheetAnalyzer({ dealId, documentId, analysis }: TermSheetAnalyzerProps) {
  const [analysisData, setAnalysisData] = useState<Partial<TermSheetAnalysis> | null>(analysis || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeTermSheet = async () => {
    if (!documentId) {
      setError('No term sheet document selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/term-sheet-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, documentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze term sheet');
      }

      const data = await response.json();
      setAnalysisData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze term sheet';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (error && !analysisData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Analysis Failed</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-6">
          Analyze a term sheet to get detailed insights on deal terms and conditions.
        </p>
        <button
          onClick={handleAnalyzeTermSheet}
          disabled={loading || !documentId}
          title={!documentId ? 'Upload a term sheet document first' : ''}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#007CF8] text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Term Sheet'
          )}
        </button>
      </div>
    );
  }

  // Build terms table data
  const terms = [];
  if (analysisData.investment_amount)
    terms.push({ name: 'Investment Amount', value: `$${(analysisData.investment_amount / 1e6).toFixed(1)}M`, status: 'standard' as const });
  if (analysisData.valuation)
    terms.push({ name: 'Valuation', value: `$${(analysisData.valuation / 1e6).toFixed(1)}M`, status: 'standard' as const });
  if (analysisData.equity_percentage)
    terms.push({ name: 'Equity %', value: `${analysisData.equity_percentage.toFixed(2)}%`, status: 'standard' as const });
  if (analysisData.liquidation_preference)
    terms.push({ name: 'Liquidation Preference', value: analysisData.liquidation_preference, status: 'standard' as const });

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      {terms.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Deal Terms</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Term</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Value</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Assessment</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((term, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{term.name}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{term.value}</td>
                    <td className="py-3 px-4">
                      <TermBadge status={term.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Dilution Analysis */}
      {analysisData.dilution_analysis && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Dilution Analysis</h2>
          <p className="text-gray-700">{analysisData.dilution_analysis}</p>
        </section>
      )}

      {/* Anti-Dilution Provisions */}
      {analysisData.anti_dilution_provisions && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Anti-Dilution Provisions</h2>
          <p className="text-gray-700">{analysisData.anti_dilution_provisions}</p>
        </section>
      )}

      {/* Board & Voting */}
      <section className="grid md:grid-cols-2 gap-8">
        {analysisData.board_composition && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Board Composition</h3>
            <p className="text-gray-700">{analysisData.board_composition}</p>
          </div>
        )}
        {analysisData.voting_rights && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Voting Rights</h3>
            <p className="text-gray-700">{analysisData.voting_rights}</p>
          </div>
        )}
      </section>

      {/* Favorable Terms */}
      {analysisData.favorable_terms && analysisData.favorable_terms.length > 0 && (
        <section className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h3 className="flex items-center gap-2 font-semibold text-green-900 mb-4">
            <CheckCircle className="h-5 w-5" />
            Favorable Terms
          </h3>
          <ul className="space-y-2">
            {analysisData.favorable_terms.map((term, index) => (
              <li key={index} className="flex gap-3 text-sm text-green-800">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Unfavorable Terms */}
      {analysisData.unfavorable_terms && analysisData.unfavorable_terms.length > 0 && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="flex items-center gap-2 font-semibold text-red-900 mb-4">
            <AlertCircle className="h-5 w-5" />
            Concerns & Unfavorable Terms
          </h3>
          <ul className="space-y-2">
            {analysisData.unfavorable_terms.map((term, index) => (
              <li key={index} className="flex gap-3 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Red Flags */}
      {analysisData.red_flags && analysisData.red_flags.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Red Flags with Explanations</h2>
          <div className="space-y-3">
            {analysisData.red_flags.map((flag, index) => (
              <div key={index} className="border-l-4 border-red-400 bg-red-50 p-4">
                <p className="text-sm text-red-900">{flag}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Negotiation Priorities */}
      {analysisData.negotiation_priorities && analysisData.negotiation_priorities.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Negotiation Priorities</h2>
          <ol className="space-y-2 list-decimal list-inside">
            {analysisData.negotiation_priorities.map((item, index) => (
              <li key={index} className="text-gray-700">{item}</li>
            ))}
          </ol>
        </section>
      )}

      {/* Key Insights */}
      {analysisData.key_insights && (
        <section className="rounded-lg bg-blue-50 border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Key Insights</h3>
          <p className="text-blue-800">{analysisData.key_insights}</p>
        </section>
      )}

      {/* Quality Score */}
      {analysisData.deal_quality_score !== undefined && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Deal Quality Score</h2>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="text-4xl font-bold text-blue-600">
                {Math.round(analysisData.deal_quality_score)}
              </div>
              <p className="text-sm text-gray-500">out of 100</p>
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${analysisData.deal_quality_score}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Reanalyze Button */}
      {analysisData && (
        <button
          onClick={handleAnalyzeTermSheet}
          disabled={loading}
          className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader className="h-5 w-5 animate-spin" />
              Re-analyzing...
            </span>
          ) : (
            'Re-analyze Term Sheet'
          )}
        </button>
      )}
    </div>
  );
}
