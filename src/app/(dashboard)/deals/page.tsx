'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { CompanyCard } from '@/components/companies/CompanyCard';
import { CompanyFilter, CompanyFilterState, InvestorPrefs } from '@/components/companies/CompanyFilter';
import { Button } from '@/components/common/Button';
import { PageHead } from '@/components/ui/design-system';
import { AlertCircle, Rocket, Search as SearchIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function BrowseCompaniesPage() {
  const isMobile = useIsMobile();
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
        const fetched = data.data || [];
        setCompanies(fetched);
        setPagination(data.pagination || { page: pageNum, limit: 20, total: 0, totalPages: 0 });

        // Use API-provided entity-scoped flags to seed local state
        const apiPipelineIds = new Set<string>();
        const apiWatchlistIds = new Set<string>();
        for (const c of fetched) {
          if (c.in_pipeline) apiPipelineIds.add(c.id);
          if (c.is_watchlisted) apiWatchlistIds.add(c.id);
        }
        if (apiPipelineIds.size > 0) setPipelineIds(prev => new Set([...prev, ...apiPipelineIds]));
        if (apiWatchlistIds.size > 0) setWatchlistedIds(prev => new Set([...prev, ...apiWatchlistIds]));
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

  if (isMobile) {
    return (
      <div style={{ padding: '0 20px' }}>
        {/* Mobile search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-sunk)', borderRadius: 10, padding: '10px 12px',
          margin: '0 0 16px', color: 'var(--ink-mute)', fontSize: 13,
        }}>
          <SearchIcon size={14} />
          <span>Search deals, sectors…</span>
        </div>

        {/* Mobile pill tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['All', 'For you', 'Closing soon', 'Score 80+', 'Saved'].map((t, i) => (
            <button key={t} style={{
              padding: '7px 14px', borderRadius: 99, fontSize: 12.5, fontWeight: 500,
              whiteSpace: 'nowrap', border: '1px solid transparent', cursor: 'pointer',
              background: i === 0 ? 'var(--ink)' : 'var(--bg-sunk)',
              color: i === 0 ? '#f4f3ee' : 'var(--ink-soft)',
            }}>
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: 'var(--ink-mute)' }} />
          </div>
        ) : companies.length === 0 ? (
          <div style={{
            background: 'var(--bg-elev)', border: '1px dashed var(--line-strong)',
            borderRadius: 14, padding: '36px 20px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No deals found</div>
            <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Try adjusting your filters.</div>
          </div>
        ) : (
          <div>
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/company/${company.slug}`}
                style={{
                  background: 'var(--bg-elev)', border: '1px solid var(--line)',
                  borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                  display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12,
                  alignItems: 'center', textDecoration: 'none', color: 'var(--ink)',
                }}
              >
                <div style={{
                  width: 38, height: 38, background: 'var(--bg-sunk)', borderRadius: 8,
                  display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)', fontSize: 15,
                }}>
                  {company.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo_url} alt="" style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 8 }} />
                  ) : getInitials(company.company_name || 'C')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.company_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[company.industry, company.stage, company.country].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {company.overall_score != null && (
                  <div style={{
                    background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                    padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    fontFamily: 'var(--serif)', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {company.overall_score}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg-sunk)]">
      {/* Sidebar Filter */}
      <CompanyFilter
        onFilterChange={handleFilterChange}
        activeFilterCount={activeFilterCount}
        investorPrefs={investorPrefs}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="p-6 pb-0">
          <PageHead
            title="Deals"
            subtitle={isLoading ? 'Loading...' : `Live primary rounds matched to your thesis. ${pagination.total} companies.`}
          />
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
                  className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-6 animate-pulse"
                >
                  <div className="flex gap-2 mb-3">
                    <div className="h-5 bg-[var(--bg-sunk)] rounded-full w-20"></div>
                    <div className="h-5 bg-[var(--bg-sunk)] rounded-full w-16"></div>
                  </div>
                  <div className="h-6 bg-[var(--bg-sunk)] rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-[var(--bg-sunk)] rounded mb-4 w-full"></div>
                  <div className="flex justify-between items-end pt-4 border-t border-[var(--line)]">
                    <div className="h-8 bg-[var(--bg-sunk)] rounded w-24"></div>
                    <div className="h-14 w-14 bg-[var(--bg-sunk)] rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            /* Empty state */
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center h-20 w-20 bg-[#F0F7FF] rounded-full mb-6">
                <Rocket className="h-10 w-10 text-[var(--accent-ink)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--ink)] mb-2">
                No companies found
              </h3>
              <p className="text-[var(--ink-soft)] mb-6 w-full md:max-w-md mx-auto">
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
          ) : isMobile ? (
            <>
              {/* Mobile: compact deal rows */}
              <div style={{ marginBottom: 16 }}>
                {companies.map((company) => (
                  <Link
                    key={company.id}
                    href={`/company/${company.slug}`}
                    style={{
                      background: 'var(--bg-elev)', border: '1px solid var(--line)',
                      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                      display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12,
                      alignItems: 'center', textDecoration: 'none', color: 'var(--ink)',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, background: 'var(--bg-sunk)', borderRadius: 8,
                      display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)',
                      fontSize: 15, color: 'var(--ink)',
                    }}>
                      {company.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={company.logo_url} alt="" style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 8 }} />
                      ) : (
                        getInitials(company.company_name || 'C')
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.company_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[company.industry, company.stage, company.country].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {company.overall_score != null && (
                      <div style={{
                        background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                        padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        fontFamily: 'var(--serif)', fontVariantNumeric: 'tabular-nums',
                      }}>
                        {company.overall_score}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Desktop: Card grid */}
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
                              ? 'bg-[var(--ink)] text-white'
                              : 'bg-[var(--bg-elev)] text-[var(--ink-soft)] border border-[var(--line)] hover:bg-[var(--bg-sunk)]'
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
