'use client';

import { useState, useCallback } from 'react';
import { INDUSTRIES, DEAL_STAGES } from '@/lib/constants';
import { Input } from '@/components/common/Input';
import { X } from 'lucide-react';

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

interface DealFilterProps {
  onFilterChange: (filters: FilterState) => void;
  activeFilterCount?: number;
}

export function DealFilter({ onFilterChange, activeFilterCount = 0 }: DealFilterProps) {
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

  const [expandedSections, setExpandedSections] = useState({
    industry: true,
    stage: true,
    funding: false,
    score: false,
  });

  const updateFilter = useCallback(
    (updates: Partial<FilterState>) => {
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
    const clearedFilters: FilterState = {
      search: '',
      industries: [],
      stages: [],
      minFunding: null,
      maxFunding: null,
      minScore: null,
      maxScore: null,
      sort: 'newest',
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
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

        {/* Sort */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Sort By
          </label>
          <select
            value={filters.sort}
            onChange={(e) =>
              updateFilter({ sort: e.target.value as FilterState['sort'] })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="score">Highest Score</option>
            <option value="funding">Highest Funding</option>
          </select>
        </div>
      </div>

      {/* Clear All Button */}
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
        <button
          onClick={() => toggleSection('industry')}
          className="flex items-center justify-between w-full"
        >
          <h4 className="font-semibold text-gray-900">Industry</h4>
          <span
            className={`text-gray-400 transition-transform ${
              expandedSections.industry ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </button>

        {expandedSections.industry && (
          <div className="space-y-2">
            {INDUSTRIES.map((industry) => (
              <label key={industry} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.industries.includes(industry)}
                  onChange={() => toggleIndustry(industry)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-700">{industry}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Stage Filter */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('stage')}
          className="flex items-center justify-between w-full"
        >
          <h4 className="font-semibold text-gray-900">Stage</h4>
          <span
            className={`text-gray-400 transition-transform ${
              expandedSections.stage ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </button>

        {expandedSections.stage && (
          <div className="space-y-2">
            {DEAL_STAGES.map((stage) => (
              <label key={stage.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.stages.includes(stage.value)}
                  onChange={() => toggleStage(stage.value)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-700">{stage.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Funding Range Filter */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('funding')}
          className="flex items-center justify-between w-full"
        >
          <h4 className="font-semibold text-gray-900">Funding Range</h4>
          <span
            className={`text-gray-400 transition-transform ${
              expandedSections.funding ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </button>

        {expandedSections.funding && (
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="Min ($)"
              value={filters.minFunding || ''}
              onChange={(e) =>
                updateFilter({
                  minFunding: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              containerClassName="w-full"
            />
            <Input
              type="number"
              placeholder="Max ($)"
              value={filters.maxFunding || ''}
              onChange={(e) =>
                updateFilter({
                  maxFunding: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              containerClassName="w-full"
            />
          </div>
        )}
      </div>

      {/* AI Score Filter */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('score')}
          className="flex items-center justify-between w-full"
        >
          <h4 className="font-semibold text-gray-900">AI Score</h4>
          <span
            className={`text-gray-400 transition-transform ${
              expandedSections.score ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </button>

        {expandedSections.score && (
          <div className="space-y-2">
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="Min Score"
              value={filters.minScore || ''}
              onChange={(e) =>
                updateFilter({
                  minScore: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              containerClassName="w-full"
            />
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="Max Score"
              value={filters.maxScore || ''}
              onChange={(e) =>
                updateFilter({
                  maxScore: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              containerClassName="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
