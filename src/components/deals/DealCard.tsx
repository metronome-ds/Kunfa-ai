'use client';

import { Deal } from '@/lib/types';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { getScoreRange } from '@/lib/constants';

interface DealCardProps {
  deal: Deal & { users?: any };
  isSaved?: boolean;
  onSaveToggle?: (dealId: string, saved: boolean) => void;
}

export function DealCard({ deal, isSaved = false, onSaveToggle }: DealCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [isLoading, setIsLoading] = useState(false);

  const scoreRange = deal.ai_score_overall ? getScoreRange(deal.ai_score_overall) : null;

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const method = saved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/deals/${deal.id}/save`, {
        method,
      });

      if (response.ok) {
        setSaved(!saved);
        onSaveToggle?.(deal.id, !saved);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedFunding = deal.funding_amount
    ? `$${(deal.funding_amount / 1000000).toFixed(1)}M`
    : 'N/A';

  const stageLabel = deal.stage
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <Link href={`/deals/${deal.id}`}>
      <div className="h-full bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer">
        {/* Card Content */}
        <div className="p-6">
          {/* Header with Save Button */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  {deal.industry}
                </span>
                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                  {stageLabel}
                </span>
              </div>

              {/* Company Name */}
              <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                {deal.company_name}
              </h3>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveClick}
              disabled={isLoading}
              className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title={saved ? 'Remove from saved' : 'Save deal'}
            >
              {saved ? (
                <BookmarkCheck className="h-5 w-5 text-blue-600 fill-blue-600" />
              ) : (
                <Bookmark className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {deal.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Funding</p>
              <p className="text-base font-semibold text-gray-900">{formattedFunding}</p>
            </div>

            {/* AI Score Circle */}
            {deal.ai_score_overall !== null && (
              <div className="flex items-center justify-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${
                    scoreRange?.bgColor || 'bg-gray-100'
                  }`}
                  title={`AI Score: ${deal.ai_score_overall} - ${scoreRange?.label}`}
                >
                  <span className={scoreRange?.textColor || 'text-gray-600'}>
                    {deal.ai_score_overall}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
