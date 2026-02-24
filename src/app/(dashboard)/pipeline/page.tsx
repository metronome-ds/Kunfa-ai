'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { PipelineKanban } from '@/components/dashboard/PipelineKanban';
import { Plus, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';

interface PipelineData {
  sourcing: any[];
  screening: any[];
  diligence: any[];
  close: any[];
}

export default function PipelinePage() {
  const [pipelineData, setPipelineData] = useState<PipelineData>({
    sourcing: [],
    screening: [],
    diligence: [],
    close: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableDeals, setAvailableDeals] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);

  const fetchPipeline = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pipeline');
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline');
      }
      const { data } = await response.json();
      setPipelineData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching pipeline:', err);
      setError('Failed to load pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const handleSearchDeals = async (query: string) => {
    if (!query.trim()) {
      setAvailableDeals([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/deals?search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const { data } = await response.json();
        setAvailableDeals(data || []);
      }
    } catch (err) {
      console.error('Error searching deals:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddDealToPipeline = async () => {
    if (!selectedDeal) return;

    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: selectedDeal,
          stage: 'sourcing',
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setSelectedDeal(null);
        setSearchQuery('');
        await fetchPipeline();
      } else if (response.status === 409) {
        setError('Deal already in pipeline');
      } else {
        setError('Failed to add deal to pipeline');
      }
    } catch (err) {
      console.error('Error adding deal:', err);
      setError('Failed to add deal to pipeline');
    }
  };

  const handleMoveStage = async (dealId: string, fromStage: string, toStage: string) => {
    const newData = { ...pipelineData };
    const dealIndex = newData[fromStage as keyof PipelineData].findIndex(
      (d) => d.deal_id === dealId
    );
    if (dealIndex !== -1) {
      const [deal] = newData[fromStage as keyof PipelineData].splice(dealIndex, 1);
      newData[toStage as keyof PipelineData].unshift(deal);
      setPipelineData(newData);
    }
  };

  const handleRemoveDeal = (dealId: string) => {
    const newData = { ...pipelineData };
    for (const stage of Object.keys(newData)) {
      newData[stage as keyof PipelineData] = newData[stage as keyof PipelineData].filter(
        (d) => d.deal_id !== dealId
      );
    }
    setPipelineData(newData);
  };

  const totalDeals =
    pipelineData.sourcing.length +
    pipelineData.screening.length +
    pipelineData.diligence.length +
    pipelineData.close.length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deal Pipeline</h1>
            <p className="text-gray-600 mt-2">Track deals through sourcing, screening, diligence, and close stages</p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Add to Pipeline
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div>
            <p className="text-sm text-gray-600">Total Deals</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{totalDeals}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-gray-600">Sourcing</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">{pipelineData.sourcing.length}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-gray-600">Screening</p>
            <p className="text-2xl font-bold text-purple-600 mt-2">{pipelineData.screening.length}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-gray-600">Close</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{pipelineData.close.length}</p>
          </div>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Kanban Board */}
      {totalDeals === 0 && !isLoading ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No deals in your pipeline yet</p>
            <p className="text-sm text-gray-500 mb-6">
              Add deals from the marketplace to get started tracking your investment opportunities
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              icon={<Plus className="h-4 w-4" />}
            >
              Add First Deal
            </Button>
          </div>
        </Card>
      ) : (
        <PipelineKanban
          data={pipelineData}
          isLoading={isLoading}
          onRefresh={fetchPipeline}
          onMoveStage={handleMoveStage}
          onRemove={handleRemoveDeal}
        />
      )}

      {/* Add to Pipeline Modal */}
      <Modal
        isOpen={showAddModal}
        title="Add Deal to Pipeline"
        onClose={() => {
          setShowAddModal(false);
          setSelectedDeal(null);
          setSearchQuery('');
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for a deal
            </label>
            <Input
              type="text"
              placeholder="Search by company name or industry..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearchDeals(e.target.value);
              }}
            />
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                </div>
              ) : availableDeals.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No deals found matching your search
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {availableDeals.map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        selectedDeal === deal.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <h4 className="font-semibold text-gray-900">{deal.company_name}</h4>
                      <p className="text-sm text-gray-600">{deal.industry}</p>
                      {deal.overall_score && (
                        <p className="text-xs text-blue-600 mt-1">
                          Score: {deal.overall_score}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Deal Info */}
          {selectedDeal && availableDeals.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              {(() => {
                const deal = availableDeals.find((d) => d.id === selectedDeal);
                return deal ? (
                  <>
                    <p className="font-semibold text-gray-900">{deal.company_name}</p>
                    <p className="text-sm text-gray-600">{deal.industry}</p>
                  </>
                ) : null;
              })()}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowAddModal(false);
                setSelectedDeal(null);
                setSearchQuery('');
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={handleAddDealToPipeline}
              disabled={!selectedDeal}
            >
              Add to Pipeline
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
