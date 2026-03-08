'use client';

import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface CompanyCardProps {
  company: {
    id: string;
    company_name: string;
    slug: string;
    description?: string | null;
    one_liner?: string | null;
    industry?: string | null;
    stage?: string | null;
    overall_score?: number | null;
    raise_amount?: number | null;
    country?: string | null;
    headquarters?: string | null;
    logo_url?: string | null;
  };
  isWatchlisted?: boolean;
  showWatchlist?: boolean;
  onWatchlistToggle?: (companyId: string, watchlisted: boolean) => void;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

export function CompanyCard({
  company,
  isWatchlisted = false,
  showWatchlist = false,
  onWatchlistToggle,
}: CompanyCardProps) {
  const [watchlisted, setWatchlisted] = useState(isWatchlisted);
  const [isLoading, setIsLoading] = useState(false);

  const blurb = company.one_liner || company.description || null;
  const truncatedBlurb = blurb && blurb.length > 100 ? blurb.slice(0, 100) + '...' : blurb;

  const location = company.country || company.headquarters || null;

  const formattedRaise = company.raise_amount
    ? company.raise_amount >= 1_000_000
      ? `$${(company.raise_amount / 1_000_000).toFixed(1)}M`
      : company.raise_amount >= 1_000
        ? `$${(company.raise_amount / 1_000).toFixed(0)}K`
        : `$${Number(company.raise_amount).toLocaleString()}`
    : null;

  const stageLabel = company.stage
    ? company.stage
        .split(/[-_]/)
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : null;

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const wasWatchlisted = watchlisted;
    setWatchlisted(!wasWatchlisted); // optimistic
    onWatchlistToggle?.(company.id, !wasWatchlisted);
    setIsLoading(true);

    try {
      const method = wasWatchlisted ? 'DELETE' : 'POST';
      const response = await fetch('/api/watchlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id }),
      });

      if (!response.ok) {
        setWatchlisted(wasWatchlisted); // revert on failure
        onWatchlistToggle?.(company.id, wasWatchlisted);
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      setWatchlisted(wasWatchlisted); // revert on error
      onWatchlistToggle?.(company.id, wasWatchlisted);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link href={`/company/${company.slug}`}>
      <div className="h-full bg-white rounded-xl border border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer">
        <div className="p-6">
          {/* Header: badges + watchlist */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-wrap items-center gap-2">
              {company.industry && (
                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  {company.industry}
                </span>
              )}
              {stageLabel && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                  {stageLabel}
                </span>
              )}
            </div>

            {showWatchlist && (
              <button
                onClick={handleWatchlistClick}
                disabled={isLoading}
                className={`ml-2 p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  watchlisted ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-100'
                }`}
                title={watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {watchlisted ? (
                  <Bookmark className="h-5 w-5 text-red-500 fill-red-500" />
                ) : (
                  <Bookmark className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            )}
          </div>

          {/* Company Name */}
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1">
            {company.company_name}
          </h3>

          {/* Location */}
          {location && (
            <p className="text-xs text-gray-500 mb-2">{location}</p>
          )}

          {/* One-liner / Description */}
          {truncatedBlurb && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
              {truncatedBlurb}
            </p>
          )}

          {/* Footer: funding + score */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              {formattedRaise && (
                <>
                  <p className="text-xs text-gray-500 mb-0.5">Raising</p>
                  <p className="text-base font-semibold text-gray-900">{formattedRaise}</p>
                </>
              )}
            </div>

            {company.overall_score != null && (
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${getScoreColor(company.overall_score)}`}
                title={`Kunfa Score: ${company.overall_score}`}
              >
                {company.overall_score}
              </div>
            )}
          </div>

          {/* View Profile link */}
          <div className="pt-3">
            <span className="text-sm text-emerald-600 font-medium hover:underline">
              View Profile &rarr;
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
