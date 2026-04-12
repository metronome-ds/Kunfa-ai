'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/common/Input';
import { X, Sparkles } from 'lucide-react';
import { STAGES, INDUSTRIES } from '@/lib/constants';

export interface CompanyFilterState {
  search: string;
  industries: string[];
  stages: string[];
  sort: 'score' | 'newest' | 'raising';
  raisingOnly: boolean;
}

export interface InvestorPrefs {
  sectorInterests: string[];
  stageFocus: string[];
}

interface CompanyFilterProps {
  onFilterChange: (filters: CompanyFilterState) => void;
  activeFilterCount?: number;
  investorPrefs?: InvestorPrefs;
}

export function CompanyFilter({ onFilterChange, activeFilterCount = 0, investorPrefs }: CompanyFilterProps) {
  const [filters, setFilters] = useState<CompanyFilterState>({
    search: '',
    industries: [],
    stages: [],
    sort: 'score',
    raisingOnly: false,
  });

  const [expandedSections, setExpandedSections] = useState({
    industry: true,
    stage: true,
  });

  // Emit initial filter state on mount so parent picks up default sort
  useEffect(() => {
    onFilterChange(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = useCallback(
    (updates: Partial<CompanyFilterState>) => {
      const newFilters = { ...filters, ...updates };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  const toggleIndustry = (industry: string) => {
    const newIndustries = filters.industries.includes(industry)
      ? filters.industries.filter((i) => i !== industry)
      : [...filters.industries, industry];
    updateFilter({ industries: newIndustries });
  };

  const toggleStage = (stage: string) => {
    const newStages = filters.stages.includes(stage)
      ? filters.stages.filter((s) => s !== stage)
      : [...filters.stages, stage];
    updateFilter({ stages: newStages });
  };

  const clearAllFilters = () => {
    const cleared: CompanyFilterState = {
      search: '',
      industries: [],
      stages: [],
      sort: 'score',
      raisingOnly: false,
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Sort industries: investor's preferred sectors first
  const prefSectors = new Set(investorPrefs?.sectorInterests || []);
  const sortedIndustries = [...INDUSTRIES].sort((a, b) => {
    const aMatch = prefSectors.has(a) ? 0 : 1;
    const bMatch = prefSectors.has(b) ? 0 : 1;
    return aMatch - bMatch;
  });

  // Sort stages: investor's preferred stages first
  const prefStages = new Set(investorPrefs?.stageFocus || []);
  const sortedStages = [...STAGES].sort((a, b) => {
    const aMatch = prefStages.has(a) ? 0 : 1;
    const bMatch = prefStages.has(b) ? 0 : 1;
    return aMatch - bMatch;
  });

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-[#0168FE] text-xs font-semibold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>

        {/* Search */}
        <Input
          placeholder="Search companies..."
          value={filters.search}
          onChange={(e) => updateFilter({ search: e.target.value })}
          containerClassName="w-full"
        />

        {/* Actively Raising Toggle */}
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Actively Raising
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={filters.raisingOnly}
            onClick={() => updateFilter({ raisingOnly: !filters.raisingOnly })}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0168FE]/30 focus:ring-offset-2 ${
              filters.raisingOnly ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                filters.raisingOnly ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        {/* Sort */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
          <select
            value={filters.sort}
            onChange={(e) => updateFilter({ sort: e.target.value as CompanyFilterState['sort'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0168FE]"
          >
            <option value="score">Highest Score</option>
            <option value="newest">Newest</option>
            <option value="raising">Actively Raising First</option>
          </select>
        </div>
      </div>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearAllFilters}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <X className="h-4 w-4" />
          Clear All Filters
        </button>
      )}

      {/* Industry Filter */}
      <div className="space-y-3">
        <button onClick={() => toggleSection('industry')} className="flex items-center justify-between w-full">
          <h4 className="font-semibold text-gray-900">Sector</h4>
          <span className={`text-gray-400 transition-transform ${expandedSections.industry ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {expandedSections.industry && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedIndustries.map((industry) => (
              <label key={industry} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.industries.includes(industry)}
                  onChange={() => toggleIndustry(industry)}
                  className="w-4 h-4 text-[#0168FE] rounded border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  {industry}
                  {prefSectors.has(industry) && (
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Stage Filter */}
      <div className="space-y-3">
        <button onClick={() => toggleSection('stage')} className="flex items-center justify-between w-full">
          <h4 className="font-semibold text-gray-900">Stage</h4>
          <span className={`text-gray-400 transition-transform ${expandedSections.stage ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {expandedSections.stage && (
          <div className="space-y-2">
            {sortedStages.map((stage) => (
              <label key={stage} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.stages.includes(stage)}
                  onChange={() => toggleStage(stage)}
                  className="w-4 h-4 text-[#0168FE] rounded border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  {stage}
                  {prefStages.has(stage) && (
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
