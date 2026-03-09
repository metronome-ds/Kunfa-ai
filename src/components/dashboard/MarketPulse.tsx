'use client';

import { TrendingUp, Zap } from 'lucide-react';

interface MarketPulseProps {
  newDealsThisWeek: number;
  topIndustry: string;
  topIndustryCount: number;
  averageScore: number | null;
  isLoading?: boolean;
}

export function MarketPulse({
  newDealsThisWeek,
  topIndustry,
  topIndustryCount,
  averageScore,
  isLoading = false,
}: MarketPulseProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">New Deals This Week</p>
            <p className="text-lg font-semibold text-gray-900">{newDealsThisWeek}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
        <div>
          <p className="text-sm text-gray-600">Top Industry</p>
          <p className="text-lg font-semibold text-gray-900">{topIndustry}</p>
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
          {topIndustryCount} deals
        </span>
      </div>

      {averageScore !== null && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Platform Average Score</p>
              <p className="text-lg font-semibold text-gray-900">{averageScore.toFixed(1)}/100</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
