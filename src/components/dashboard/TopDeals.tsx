'use client';

import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';
import { DealStage } from '@/lib/types';

interface DealCardProps {
  id: string;
  company_name: string;
  industry: string;
  stage: string;
  overall_score: number | null;
  funding_amount_requested: number | null;
}

interface TopDealsProps {
  deals: DealCardProps[];
  isLoading?: boolean;
  emptyMessage?: string;
}

function getScoreBadgeColor(score: number | null) {
  if (score === null) return 'bg-gray-100 text-gray-700';
  if (score >= 80) return 'bg-green-100 text-green-700';
  if (score >= 60) return 'bg-blue-100 text-blue-700';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700';
  if (score >= 20) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function getStageColor(stage: string) {
  const stageMap: Record<string, string> = {
    'pre-seed': 'text-gray-600 bg-gray-100',
    seed: 'text-blue-600 bg-blue-100',
    'series-a': 'text-purple-600 bg-purple-100',
    'series-b': 'text-indigo-600 bg-indigo-100',
    'series-c': 'text-green-600 bg-green-100',
    'series-d': 'text-orange-600 bg-orange-100',
    'series-d+': 'text-red-600 bg-red-100',
  };
  return stageMap[stage] || 'text-gray-600 bg-gray-100';
}

function DealCard({ id, company_name, industry, stage, overall_score, funding_amount_requested }: DealCardProps) {
  return (
    <Link href={`/deals/${id}`}>
      <div className="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">{company_name}</h3>
            <p className="text-xs text-gray-500 mt-1">{industry}</p>
          </div>
          <div className={`text-xs font-semibold px-2 py-1 rounded ${getScoreBadgeColor(overall_score)}`}>
            {overall_score ? `${Math.round(overall_score)}` : 'Not Scored'}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium px-2 py-1 rounded ${getStageColor(stage)}`}>
            {stage}
          </span>
          {funding_amount_requested && (
            <span className="text-xs text-gray-600 font-medium">{formatCompactNumber(funding_amount_requested)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function TopDeals({ deals, isLoading = false, emptyMessage = 'No deals yet' }: TopDealsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-48 bg-gray-200 rounded mb-3" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-gray-200 rounded" />
              <div className="h-6 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <DealCard key={deal.id} {...deal} />
      ))}
      {deals.length > 0 && (
        <Link href="/deals" className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 py-3">
          View All Deals
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
