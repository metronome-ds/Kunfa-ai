'use client';

import { Bookmark, PlusCircle, Check, Sparkles, Clock } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import CompanyLogo from '@/components/common/CompanyLogo';
import { SourceBadge } from '@/components/common/SourceBadge';
import { getRaisingUrgency } from '@/lib/utils';

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
    is_raising?: boolean | null;
    raising_amount?: string | null;
    raising_instrument?: string | null;
    raising_target_close?: string | null;
    source?: string | null;
  };
  isWatchlisted?: boolean;
  showWatchlist?: boolean;
  onWatchlistToggle?: (companyId: string, watchlisted: boolean) => void;
  recommended?: boolean;
  inPipeline?: boolean;
  onPipelineAdd?: (companyId: string) => void;
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
  recommended = false,
  inPipeline: initialInPipeline = false,
  onPipelineAdd,
}: CompanyCardProps) {
  const [watchlisted, setWatchlisted] = useState(isWatchlisted);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
  const [pipelineAdded, setPipelineAdded] = useState(initialInPipeline);
  const [isPipelineLoading, setIsPipelineLoading] = useState(false);

  const urgency = getRaisingUrgency(company.raising_target_close, company.is_raising);
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
    setIsWatchlistLoading(true);

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
      setIsWatchlistLoading(false);
    }
  };

  const handlePipelineClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pipelineAdded || isPipelineLoading) return;

    setPipelineAdded(true); // optimistic
    setIsPipelineLoading(true);

    try {
      const response = await fetch('/api/pipeline/add-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        // Don't revert if already in pipeline
        if (data.error !== 'Already in pipeline') {
          setPipelineAdded(false);
        }
      }
      onPipelineAdd?.(company.id);
    } catch (error) {
      console.error('Error adding to pipeline:', error);
      setPipelineAdded(false);
    } finally {
      setIsPipelineLoading(false);
    }
  };

  return (
    <Link href={`/company/${company.slug}`}>
      <div className="h-full bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] hover:border-[var(--line-strong)]/60  hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer">
        <div className="p-6">
          {/* Header: badges + watchlist */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-wrap items-center gap-2">
              {recommended && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                  <Sparkles className="w-3 h-3" />
                  Recommended
                </span>
              )}
              {company.is_raising && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {company.raising_amount ? `Raising ${company.raising_amount}` : 'Raising'}
                </span>
              )}
              {urgency && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${urgency.color}`}>
                  <Clock className="w-3 h-3" />
                  {urgency.label}
                </span>
              )}
              {company.industry && (
                <span className="px-2.5 py-1 bg-[#F0F7FF] text-[var(--accent-ink)] text-xs font-semibold rounded-full">
                  {company.industry}
                </span>
              )}
              {stageLabel && (
                <span className="px-2.5 py-1 bg-[var(--bg-sunk)] text-[var(--ink-soft)] text-xs font-semibold rounded-full">
                  {stageLabel}
                </span>
              )}
              <SourceBadge source={company.source} />
            </div>

            {showWatchlist && (
              <button
                onClick={handleWatchlistClick}
                disabled={isWatchlistLoading}
                className={`ml-2 p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  watchlisted ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-[var(--bg-sunk)]'
                }`}
                title={watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {watchlisted ? (
                  <Bookmark className="h-5 w-5 text-red-500 fill-red-500" />
                ) : (
                  <Bookmark className="h-5 w-5 text-[var(--ink-faint)] hover:text-[var(--ink-soft)]" />
                )}
              </button>
            )}
          </div>

          {/* Company Name + Logo */}
          <div className="flex items-center gap-2.5 mb-1">
            <CompanyLogo name={company.company_name} logoUrl={company.logo_url} size="md" />
            <h3 className="text-lg font-bold text-[var(--ink)] line-clamp-1">
              {company.company_name}
            </h3>
          </div>

          {/* Location */}
          {location && (
            <p className="text-xs text-[var(--ink-mute)] mb-2">{location}</p>
          )}

          {/* One-liner / Description */}
          {truncatedBlurb && (
            <p className="text-sm text-[var(--ink-soft)] line-clamp-2 mb-4">
              {truncatedBlurb}
            </p>
          )}

          {/* Footer: funding + score */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
            <div>
              {formattedRaise && (
                <>
                  <p className="text-xs text-[var(--ink-mute)] mb-0.5">Raising</p>
                  <p className="text-base font-semibold text-[var(--ink)]">{formattedRaise}</p>
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

          {/* Actions: Pipeline + View Profile */}
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-[var(--accent-ink)] font-medium hover:underline">
              View Profile &rarr;
            </span>

            {showWatchlist && (
              <button
                onClick={handlePipelineClick}
                disabled={pipelineAdded || isPipelineLoading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pipelineAdded
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                    : 'bg-[var(--ink)]/10 text-[var(--accent-ink)] hover:bg-[var(--ink)]/20 border border-transparent'
                }`}
                title={pipelineAdded ? 'Already in pipeline' : 'Add to pipeline'}
              >
                {pipelineAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    In Pipeline
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add to Pipeline
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
