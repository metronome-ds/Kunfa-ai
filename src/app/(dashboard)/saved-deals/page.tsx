'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ArrowUpDown, Plus, Heart, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getScoreRange } from '@/lib/constants';

type SortBy = 'date_saved' | 'ai_score' | 'company_name';

interface WatchlistItem {
  id: string;
  investor_id: string;
  company_id: string;
  created_at: string;
  company_pages?: {
    id: string;
    company_name: string;
    slug: string;
    description: string | null;
    overall_score: number | null;
    industry: string | null;
    stage: string | null;
    raise_amount: number | null;
    country: string | null;
  } | null;
}

function formatRaiseAmount(amount: number | null) {
  if (!amount) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default function SavedDealsPage() {
  const [savedDeals, setSavedDeals] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('date_saved');

  const fetchSavedDeals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/deals/saved');
      if (!response.ok) {
        throw new Error('Failed to fetch saved deals');
      }
      const { data } = await response.json();
      setSavedDeals(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching saved deals:', err);
      setError('Failed to load saved deals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedDeals();
  }, []);

  const handleRemove = async (companyId: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      if (response.ok) {
        setSavedDeals(savedDeals.filter((d) => d.company_id !== companyId));
      }
    } catch (err) {
      console.error('Error removing saved deal:', err);
    }
  };

  const handleAddToPipeline = async (companyId: string) => {
    try {
      const response = await fetch('/api/pipeline/add-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      if (response.ok) {
        alert('Added to pipeline');
      } else if (response.status === 409) {
        alert('Already in your pipeline');
      } else {
        alert('Failed to add to pipeline');
      }
    } catch (err) {
      console.error('Error adding to pipeline:', err);
    }
  };

  const sortedDeals = [...savedDeals].sort((a, b) => {
    const compA = a.company_pages;
    const compB = b.company_pages;
    switch (sortBy) {
      case 'ai_score':
        return (compB?.overall_score || 0) - (compA?.overall_score || 0);
      case 'company_name':
        return (compA?.company_name || '').localeCompare(compB?.company_name || '');
      case 'date_saved':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading saved deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Watchlist</h1>
            <p className="text-gray-600 mt-2">Companies you&apos;re tracking</p>
          </div>
          <Link href="/deals">
            <Button icon={<Plus className="h-4 w-4" />}>
              Browse Deals
            </Button>
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Empty State */}
      {savedDeals.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No saved companies yet
            </h3>
            <p className="text-gray-600 mb-6">
              Browse the marketplace to find companies and add them to your watchlist
            </p>
            <Link href="/deals">
              <Button icon={<Plus className="h-4 w-4" />}>
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Sort Controls */}
          <div className="mb-6 flex items-center gap-4">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort by:
            </span>
            <div className="flex gap-2">
              {[
                { value: 'date_saved', label: 'Date Saved' },
                { value: 'ai_score', label: 'AI Score' },
                { value: 'company_name', label: 'Company Name' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as SortBy)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Company Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDeals.map((item) => {
              const company = item.company_pages;
              if (!company) return null;
              const scoreRange = company.overall_score ? getScoreRange(company.overall_score) : null;
              const funding = formatRaiseAmount(company.raise_amount);

              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 overflow-hidden">
                  <div className="p-6">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      {company.industry && (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {company.industry}
                        </span>
                      )}
                      {company.stage && (
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                          {company.stage}
                        </span>
                      )}
                    </div>

                    {/* Company Name */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{company.company_name}</h3>

                    {/* Description */}
                    {company.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{company.description}</p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        {funding && (
                          <>
                            <p className="text-xs text-gray-500">Funding</p>
                            <p className="text-base font-semibold text-gray-900">{funding}</p>
                          </>
                        )}
                      </div>

                      {company.overall_score != null && scoreRange && (
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${scoreRange.bgColor}`}
                          title={`Score: ${company.overall_score}`}
                        >
                          <span className={scoreRange.textColor}>{company.overall_score}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3">
                      {company.slug && (
                        <Link
                          href={`/company/${company.slug}`}
                          className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Profile
                        </Link>
                      )}
                      <div className="flex-1" />
                      <button
                        onClick={() => handleAddToPipeline(item.company_id)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        Add to Pipeline
                      </button>
                      <button
                        onClick={() => handleRemove(item.company_id)}
                        className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
                        title="Remove from watchlist"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div>
                <p className="text-sm text-gray-600">Total Saved</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{savedDeals.length}</p>
              </div>
            </Card>
            <Card>
              <div>
                <p className="text-sm text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {savedDeals.length > 0
                    ? Math.round(
                        savedDeals.reduce((sum, d) => sum + (d.company_pages?.overall_score || 0), 0) /
                          savedDeals.length
                      )
                    : 0}
                </p>
              </div>
            </Card>
            <Card>
              <div>
                <p className="text-sm text-gray-600">Industries</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {new Set(savedDeals.map((d) => d.company_pages?.industry).filter(Boolean)).size}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
