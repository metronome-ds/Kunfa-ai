'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DealCard } from '@/components/deals/DealCard';
import { DealFilter } from '@/components/deals/DealFilter';
import { Button } from '@/components/common/Button';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { Deal } from '@/lib/types';

interface FilterState {
  search: string;
  industries: string[];
  stages: string[];
  minFunding: number | null;
  maxFunding: number | null;
  minScore: number | null;
  maxScore: number | null;
  sort: 'newest' | 'score' | 'funding';
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function DealsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deals, setDeals] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    industries: [],
    stages: [],
    minFunding: null,
    maxFunding: null,
    minScore: null,
    maxScore: null,
    sort: 'newest',
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedDealIds, setSavedDealIds] = useState<Set<string>>(new Set());

  // Load filters from URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const newFilters: FilterState = {
      search: params.get('search') || '',
      industries: params.getAll('industries') || [],
      stages: params.getAll('stages') || [],
      minFunding: params.get('minFunding') ? parseInt(params.get('minFunding')!) : null,
      maxFunding: params.get('maxFunding') ? parseInt(params.get('maxFunding')!) : null,
      minScore: params.get('minScore') ? parseInt(params.get('minScore')!) : null,
      maxScore: params.get('maxScore') ? parseInt(params.get('maxScore')!) : null,
      sort: (params.get('sort') as FilterState['sort']) || 'newest',
    };
    setFilters(newFilters);
  }, [searchParams]);

  // Fetch deals
  const fetchDeals = useCallback(
    async (pageNum = 1) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', pageNum.toString());
        params.set('limit', pagination.limit.toString());
        params.set('sort', filters.sort);

        if (filters.search) params.set('search', filters.search);
        filters.industries.forEach((ind) => params.append('industry', ind));
        filters.stages.forEach((stage) => params.append('stage', stage));
        if (filters.minFunding) params.set('minFunding', filters.minFunding.toString());
        if (filters.maxFunding) params.set('maxFunding', filters.maxFunding.toString());
        if (filters.minScore) params.set('minScore', filters.minScore.toString());
        if (filters.maxScore) params.set('maxScore', filters.maxScore.toString());

        const response = await fetch(`/api/deals?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch deals');
        }

        const data = await response.json();
        setDeals(data.data || []);
        setPagination(data.pagination || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setDeals([]);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  // Fetch saved deals
  const fetchSavedDeals = useCallback(async () => {
    try {
      const response = await fetch('/api/deals/saved');
      if (response.ok) {
        const data = await response.json();
        setSavedDealIds(new Set(data.data.map((d: any) => d.company_id)));
      }
    } catch (err) {
      console.error('Failed to fetch saved deals:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDeals(1);
    fetchSavedDeals();
  }, [filters]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Update URL
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    newFilters.industries.forEach((ind) => params.append('industries', ind));
    newFilters.stages.forEach((stage) => params.append('stages', stage));
    if (newFilters.minFunding) params.set('minFunding', newFilters.minFunding.toString());
    if (newFilters.maxFunding) params.set('maxFunding', newFilters.maxFunding.toString());
    if (newFilters.minScore) params.set('minScore', newFilters.minScore.toString());
    if (newFilters.maxScore) params.set('maxScore', newFilters.maxScore.toString());
    params.set('sort', newFilters.sort);

    router.push(`/deals?${params.toString()}`);
  };

  const handleSaveToggle = async (_dealId: string, _saved: boolean) => {
    // Re-fetch watchlist to stay in sync (watchlist uses company_id, not deal_id)
    await fetchSavedDeals();
  };

  const activeFilterCount = Object.values(filters).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== '' && v !== 'newest';
  }).length;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Filter */}
      <DealFilter
        onFilterChange={handleFilterChange}
        activeFilterCount={activeFilterCount}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Deal Marketplace</h1>
            <Button
              onClick={() => router.push('/deals/create')}
              icon={<Plus className="h-5 w-5" />}
              variant="primary"
              size="lg"
            >
              List a Deal
            </Button>
          </div>
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : `${pagination.total} deals available`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error loading deals</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {isLoading && deals.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded mb-3 w-20"></div>
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4 w-32"></div>
                  <div className="flex justify-between items-end pt-4 border-t border-gray-100">
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                    <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center h-16 w-16 bg-gray-100 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No deals found
              </h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Try adjusting your filters or search terms to find more deals.
              </p>
              <Button
                onClick={() => handleFilterChange({
                  search: '',
                  industries: [],
                  stages: [],
                  minFunding: null,
                  maxFunding: null,
                  minScore: null,
                  maxScore: null,
                  sort: 'newest',
                })}
                variant="secondary"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {deals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    isSaved={savedDealIds.has(deal.company_id)}
                    onSaveToggle={handleSaveToggle}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={() => fetchDeals(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    variant="secondary"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .slice(
                        Math.max(0, pagination.page - 3),
                        Math.min(pagination.totalPages, pagination.page + 2)
                      )
                      .map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => fetchDeals(pageNum)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            pagination.page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                  </div>

                  <Button
                    onClick={() => fetchDeals(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    variant="secondary"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
