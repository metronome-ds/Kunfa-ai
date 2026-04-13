'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { CompanyCard } from '@/components/companies/CompanyCard';
import { CompanyFilter, CompanyFilterState, InvestorPrefs } from '@/components/companies/CompanyFilter';
import { Button } from '@/components/common/Button';
import { AlertCircle, Rocket } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function BrowseCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [filters, setFilters] = useState<CompanyFilterState>({
    search: '',
    industries: [],
    stages: [],
    sort: 'score',
    raisingOnly: false,
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlistedIds, setWatchlistedIds] = useState<Set<string>>(new Set());
  const [pipelineIds, setPipelineIds] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [investorPrefs, setInvestorPrefs] = useState<InvestorPrefs>({
    sectorInterests: [],
    stageFocus: [],
  });

  // Track whether initial load is done to avoid double-fetch
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Fetch companies from company_pages
  const fetchCompanies = useCallback(
    async (pageNum = 1) => {
      setIsLoading(true);
      setError(null);

      try {
        const currentFilters = filtersRef.current;
        const params = new URLSearchParams();
        params.set('page', pageNum.toString());
        params.set('limit', pagination.limit.toString());
        params.set('sort', currentFilters.sort);

        if (currentFilters.search) params.set('search', currentFilters.search);
        currentFilters.industries.forEach((ind) => params.append('industry', ind));
        currentFilters.stages.forEach((stage) => params.append('stage', stage));
        if (currentFilters.raisingOnly) params.set('raising', 'true');

        const response = await fetch(`/api/companies/browse?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch companies');

        const data = await response.json();
        setCompanies(data.data || []);
        setPagination(data.pagination || { page: pageNum, limit: 20, total: 0, totalPages: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setCompanies([]);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit]
  );

  // Fetch watchlisted company IDs
  const fetchWatchlist = useCallback(async () => {
    try {
      const response = await fetch('/api/watchlist');
      if (response.ok) {
        const data = await response.json();
        const ids = new Set<string>(
          (data.data || []).map((item: any) => {
            const cp = item.company_pages;
            return cp?.id || null;
          }).filter(Boolean)
        );
        setWatchlistedIds(ids);
        setIsLoggedIn(true);
      } else if (response.status === 401) {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

  // Fetch pipeline deal company IDs
  const fetchPipelineIds = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: deals } = await supabase
        .from('deals')
        .select('company_id')
        .eq('created_by', user.id);

      if (deals) {
        setPipelineIds(new Set(deals.map(d => d.company_id).filter(Boolean)));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch investor preferences
  const fetchInvestorPrefs = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('sector_interests, stage_focus')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setInvestorPrefs({
          sectorInterests: profile.sector_interests || [],
          stageFocus: profile.stage_focus || [],
        });
      }
    } catch {
      // ignore — prefs are optional
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCompanies(1);
    fetchWatchlist();
    fetchPipelineIds();
    fetchInvestorPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filters change (but not on initial mount — handled above)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchCompanies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (newFilters: CompanyFilterState) => {
    setFilters(newFilters);
  };

  // Watchlist toggle: optimistic update in CompanyCard, just sync the set here
  const handleWatchlistToggle = (companyId: string, nowWatchlisted: boolean) => {
    setWatchlistedIds((prev) => {
      const next = new Set(prev);
      if (nowWatchlisted) next.add(companyId);
      else next.delete(companyId);
      return next;
    });
  };

  // Pipeline add: optimistic update in CompanyCard, just sync the set here
  const handlePipelineAdd = (companyId: string) => {
    setPipelineIds((prev) => {
      const next = new Set(prev);
      next.add(companyId);
      return next;
    });
  };

  // Determine if a company matches investor preferences
  const isRecommended = (company: any): boolean => {
    if (!investorPrefs.sectorInterests.length && !investorPrefs.stageFocus.length) return false;
    const sectorMatch = company.industry && investorPrefs.sectorInterests.includes(company.industry);
    const stageMatch = company.stage && investorPrefs.stageFocus.includes(company.stage);
    return !!(sectorMatch || stageMatch);
  };

  const activeFilterCount = [
    filters.search,
    ...filters.industries,
    ...filters.stages,
    filters.sort !== 'score' ? filters.sort : null,
    filters.raisingOnly ? 'raising' : null,
  ].filter(Boolean).length;

  return (
    <div className="flex h-screen bg-[#F8F9FB]">
      {/* Sidebar Filter */}
      <CompanyFilter
        onFilterChange={handleFilterChange}
        activeFilterCount={activeFilterCount}
        investorPrefs={investorPrefs}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Browse Companies</h1>
          </div>
          <p className="text-gray-600">
            {isLoading
              ? 'Loading...'
              : `Showing ${companies.length} of ${pagination.total} companies`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error loading companies</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {isLoading && companies.length === 0 ? (
            /* Skeleton loader */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
                >
                  <div className="flex gap-2 mb-3">
                    <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                    <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4 w-full"></div>
                  <div className="flex justify-between items-end pt-4 border-t border-gray-100">
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                    <div className="h-14 w-14 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            /* Empty state */
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center h-20 w-20 bg-[#F0F7FF] rounded-full mb-6">
                <Rocket className="h-10 w-10 text-[#007CF8]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No companies found
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {activeFilterCount > 0
                  ? 'Try adjusting your filters to see more companies.'
                  : 'Be the first to get scored! Submit your pitch deck and get an AI-powered investment analysis in minutes.'}
              </p>
              {activeFilterCount === 0 && (
                <Link href="/">
                  <Button variant="primary" size="lg">
                    Get Your Kunfa Score
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {companies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    isWatchlisted={watchlistedIds.has(company.id)}
                    showWatchlist={isLoggedIn}
                    onWatchlistToggle={handleWatchlistToggle}
                    recommended={isRecommended(company)}
                    inPipeline={pipelineIds.has(company.id)}
                    onPipelineAdd={handlePipelineAdd}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={() => fetchCompanies(pagination.page - 1)}
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
                          onClick={() => fetchCompanies(pageNum)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            pagination.page === pageNum
                              ? 'bg-[#007CF8] text-white'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-[#F8F9FB]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                  </div>

                  <Button
                    onClick={() => fetchCompanies(pagination.page + 1)}
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
