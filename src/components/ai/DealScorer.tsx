'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { ScoringResponse, ScoringDimensions } from '@/lib/types';

interface DealScorerProps {
  dealId: string;
  scores?: ScoringResponse;
}

interface ScoreDimension {
  key: keyof ScoringDimensions;
  label: string;
  weight: number;
  reasoning?: string;
}

const DIMENSIONS: ScoreDimension[] = [
  { key: 'team', label: 'Team', weight: 25 },
  { key: 'market', label: 'Market', weight: 20 },
  { key: 'traction', label: 'Traction', weight: 20 },
  { key: 'product', label: 'Product', weight: 15 },
  { key: 'financials', label: 'Financials', weight: 10 },
  { key: 'competitive_landscape', label: 'Competitive', weight: 10 },
];

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green-50 border-green-200';
  if (score >= 50) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

function getProgressBarColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function CircularGauge({ score }: { score: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 120 120"
        >
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={score >= 70 ? '#16a34a' : score >= 50 ? '#ca8a04' : '#dc2626'}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {Math.round(score)}
          </div>
          <div className="text-xs text-gray-500">Score</div>
        </div>
      </div>
    </div>
  );
}

export function DealScorer({ dealId, scores }: DealScorerProps) {
  const [scoringData, setScoringData] = useState<ScoringResponse | null>(scores || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  const handleScoreDeal = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/score-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to score deal');
      }

      const data = await response.json();
      setScoringData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to score deal';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (error && !scoringData) {
    return (
      <div className={`rounded-lg border p-6 ${getScoreBgColor(0)}`}>
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Scoring Failed</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
            <p className="text-xs text-red-700 mt-2">
              Make sure you have uploaded and parsed at least one document.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!scoringData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-600 mb-6">
            No scoring data available. Score this deal to get AI-powered analysis.
          </p>
          <button
            onClick={handleScoreDeal}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Scoring in progress...
              </>
            ) : (
              'Score This Deal'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overall Score Section */}
      <div className={`rounded-lg border p-8 ${getScoreBgColor(scoringData.overall_score)}`}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Investment Score</h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <CircularGauge score={scoringData.overall_score} />
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Investment Summary</h3>
              <p className="text-gray-700">{scoringData.summary}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Confidence Level</h3>
              <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-white bg-opacity-50">
                {scoringData.confidence_level.charAt(0).toUpperCase() + scoringData.confidence_level.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Dimensions */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900">Scoring Breakdown</h3>
        <div className="grid gap-4">
          {DIMENSIONS.map((dimension) => {
            const score = scoringData.dimensions[dimension.key];
            const isExpanded = expandedDimension === dimension.key;

            return (
              <div
                key={dimension.key}
                className="rounded-lg border border-gray-200 bg-white"
              >
                <button
                  onClick={() => setExpandedDimension(isExpanded ? null : dimension.key)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-baseline gap-4 mb-2">
                      <span className="font-semibold text-gray-900">{dimension.label}</span>
                      <span className="text-sm text-gray-500">({dimension.weight}%)</span>
                      <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                        {Math.round(score)}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(score)} transition-all duration-300`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 ml-4 flex-shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-700">
                    <p>
                      This dimension evaluates the company&apos;s{' '}
                      {dimension.key === 'team'
                        ? 'founding team, experience, and complementary skills'
                        : dimension.key === 'market'
                        ? 'market size, growth potential, and timing'
                        : dimension.key === 'traction'
                        ? 'revenue, user growth, and key milestones'
                        : dimension.key === 'product'
                        ? 'product innovation and technical feasibility'
                        : dimension.key === 'financials'
                        ? 'unit economics and path to profitability'
                        : 'competitive moat and long-term positioning'}
                      .
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Green Flags */}
      {scoringData.green_flags.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h3 className="flex items-center gap-2 font-semibold text-green-900 mb-4">
            <CheckCircle className="h-5 w-5" />
            Strengths
          </h3>
          <ul className="space-y-2">
            {scoringData.green_flags.map((flag, index) => (
              <li key={index} className="flex gap-3 text-sm text-green-800">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Red Flags */}
      {scoringData.red_flags.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="flex items-center gap-2 font-semibold text-red-900 mb-4">
            <AlertCircle className="h-5 w-5" />
            Concerns
          </h3>
          <ul className="space-y-2">
            {scoringData.red_flags.map((flag, index) => (
              <li key={index} className="flex gap-3 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rescore Button */}
      {scoringData && (
        <button
          onClick={handleScoreDeal}
          disabled={loading}
          className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader className="h-5 w-5 animate-spin" />
              Re-scoring...
            </span>
          ) : (
            'Re-score Deal'
          )}
        </button>
      )}
    </div>
  );
}
