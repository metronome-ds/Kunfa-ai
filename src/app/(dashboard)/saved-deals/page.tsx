'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { DealCard } from '@/components/deals/DealCard';
import { ArrowUpDown, Plus } from 'lucide-react';
import Link from 'next/link';

type SortBy = 'date_saved' | 'ai_score' | 'company_name';

interface SavedDeal {
  id: string;
  deal_id: string;
  deals?: any;
  created_at: string;
  notes?: string;
}

export default function SavedDealsPage() {
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);
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

  const handleRemove = async (dealId: string) => {
    try {
      const response = await fetch(`/api/deals/${dealId}/save`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSavedDeals(savedDeals.filter((d) => d.deal_id !== dealId));
      }
    } catch (err) {
      console.error('Error removing saved deal:', err);
    }
  };

  const handleAddToPipeline = async (dealId: string) => {
    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          stage: 'sourcing',
        }),
      });

      if (response.ok) {
        alert('Deal added to pipeline');
      } else if (response.status === 409) {
        alert('Deal is already in your pipeline');
      } else {
        alert('Failed to add deal to pipeline');
      }
    } catch (err) {
      console.error('Error adding to pipeline:', err);
    }
  };

  const sortedDeals = [...savedDeals].sort((a, b) => {
    switch (sortBy) {
      case 'ai_score':
        return (b.deals?.overall_score || 0) - (a.deals?.overall_score || 0);
      case 'company_name':
        return (a.deals?.company_name || '').localeCompare(
          b.deals?.company_name || ''
        );
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
            <h1 className="text-3xl font-bold text-gray-900">Saved Deals</h1>
            <p className="text-gray-600 mt-2">Your watchlist of investment opportunities</p>
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
              No saved deals yet
            </h3>
            <p className="text-gray-600 mb-6">
              Browse the marketplace to find deals and save them to your watchlist
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

          {/* Deal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDeals.map((savedDeal) => {
              const deal = savedDeal.deals;
              return (
                <div key={savedDeal.id} className="relative">
                  <DealCard
                    deal={deal}
                    isSaved={true}
                    onSaveToggle={() => handleRemove(deal.id)}
                  />
                  {/* Quick Action Button */}
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToPipeline(deal.id);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      Add to Pipeline
                    </button>
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
                        savedDeals.reduce((sum, d) => sum + (d.deals?.overall_score || 0), 0) /
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
                  {new Set(savedDeals.map((d) => d.deals?.industry)).size}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
