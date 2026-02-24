'use client';

import { useState } from 'react';
import { Loader, Download, AlertCircle } from 'lucide-react';
import { CompanyBrief as CompanyBriefType } from '@/lib/types';

interface CompanyBriefProps {
  dealId: string;
  brief?: Partial<CompanyBriefType>;
}

export function CompanyBrief({ dealId, brief }: CompanyBriefProps) {
  const [briefData, setBriefData] = useState<Partial<CompanyBriefType> | null>(brief || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateBrief = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/company-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate brief');
      }

      const data = await response.json();
      setBriefData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate brief';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (error && !briefData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Generation Failed</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!briefData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-6">
          Generate a comprehensive company brief from deal documents.
        </p>
        <button
          onClick={handleGenerateBrief}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Brief'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {briefData.company_name && (
            <h1 className="text-3xl font-bold text-gray-900">{briefData.company_name}</h1>
          )}
          {briefData.tagline && (
            <p className="text-lg text-gray-600 mt-2">{briefData.tagline}</p>
          )}
        </div>
        <button
          disabled
          title="PDF export coming soon"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium opacity-50 cursor-not-allowed"
        >
          <Download className="h-5 w-5" />
          Export PDF
        </button>
      </div>

      {/* Executive Summary */}
      {briefData.executive_summary && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {briefData.executive_summary}
            </p>
          </div>
        </section>
      )}

      {/* Mission */}
      {briefData.mission && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Mission</h2>
          <p className="text-gray-700">{briefData.mission}</p>
        </section>
      )}

      {/* Problem & Solution */}
      <section className="grid md:grid-cols-2 gap-8">
        {briefData.target_market && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Target Market</h3>
            <p className="text-gray-700">{briefData.target_market}</p>
          </div>
        )}
        {briefData.product_description && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Product/Solution</h3>
            <p className="text-gray-700">{briefData.product_description}</p>
          </div>
        )}
      </section>

      {/* Market & Business Model */}
      <section className="grid md:grid-cols-2 gap-8">
        {briefData.business_model && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Business Model</h3>
            <p className="text-gray-700">{briefData.business_model}</p>
          </div>
        )}
        {briefData.go_to_market_strategy && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Go-to-Market</h3>
            <p className="text-gray-700">{briefData.go_to_market_strategy}</p>
          </div>
        )}
      </section>

      {/* Team */}
      {(briefData.founding_team || briefData.key_experience) && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Team</h2>
          {briefData.founding_team && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Founding Team</h4>
              <p className="text-gray-700">{briefData.founding_team}</p>
            </div>
          )}
          {briefData.key_experience && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Key Experience</h4>
              <p className="text-gray-700">{briefData.key_experience}</p>
            </div>
          )}
        </section>
      )}

      {/* Product */}
      {briefData.product_description && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Product</h2>
          <p className="text-gray-700">{briefData.product_description}</p>
        </section>
      )}

      {/* Traction */}
      {(briefData.key_metrics || briefData.recent_milestones) && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Traction</h2>
          {briefData.key_metrics && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Key Metrics</h4>
              <p className="text-gray-700">{briefData.key_metrics}</p>
            </div>
          )}
          {briefData.recent_milestones && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Recent Milestones</h4>
              <p className="text-gray-700">{briefData.recent_milestones}</p>
            </div>
          )}
        </section>
      )}

      {/* Financials */}
      {(briefData.revenue_model || briefData.unit_economics || briefData.financial_highlights) && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Financials</h2>
          {briefData.revenue_model && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Revenue Model</h4>
              <p className="text-gray-700">{briefData.revenue_model}</p>
            </div>
          )}
          {briefData.unit_economics && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Unit Economics</h4>
              <p className="text-gray-700">{briefData.unit_economics}</p>
            </div>
          )}
          {briefData.financial_highlights && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Highlights</h4>
              <p className="text-gray-700">{briefData.financial_highlights}</p>
            </div>
          )}
        </section>
      )}

      {/* Regenerate Button */}
      <button
        onClick={handleGenerateBrief}
        disabled={loading}
        className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader className="h-5 w-5 animate-spin" />
            Regenerating...
          </span>
        ) : (
          'Regenerate Brief'
        )}
      </button>
    </div>
  );
}
