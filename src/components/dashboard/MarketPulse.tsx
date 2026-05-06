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
          <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-sunk)] rounded-lg animate-pulse">
            <div className="h-4 w-32 bg-[var(--bg-sunk)] rounded" />
            <div className="h-4 w-16 bg-[var(--bg-sunk)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--bg-sunk)] rounded-lg border border-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--accent-soft)] rounded-lg">
            <TrendingUp className="h-5 w-5 text-[var(--ink)]" />
          </div>
          <div>
            <p className="text-sm text-[var(--ink-soft)]">New Deals This Week</p>
            <p className="text-lg font-semibold text-[var(--ink)]">{newDealsThisWeek}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
        <div>
          <p className="text-sm text-[var(--ink-soft)]">Top Industry</p>
          <p className="text-lg font-semibold text-[var(--ink)]">{topIndustry}</p>
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
          {topIndustryCount} deals
        </span>
      </div>

      {averageScore !== null && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--bg-sunk)] rounded-lg border border-[var(--line)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--ink-soft)]">Platform Average Score</p>
              <p className="text-lg font-semibold text-[var(--ink)]">{averageScore.toFixed(1)}/100</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
