'use client';

import { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Plus,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { Deal } from '@/lib/types';
import { getScoreRange, getPipelineStageLabel } from '@/lib/constants';

interface PipelineStageData {
  sourcing: any[];
  screening: any[];
  diligence: any[];
  close: any[];
}

interface PipelineKanbanProps {
  data: PipelineStageData;
  isLoading?: boolean;
  onRefresh?: () => void;
  onMoveStage?: (dealId: string, fromStage: string, toStage: string) => void;
  onRemove?: (dealId: string) => void;
}

const STAGES = [
  { id: 'sourcing', label: 'Sourcing', color: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'screening', label: 'Screening', color: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'diligence', label: 'Diligence', color: 'bg-orange-50', borderColor: 'border-orange-200' },
  { id: 'close', label: 'Close', color: 'bg-green-50', borderColor: 'border-green-200' },
];

function PipelineDealCard({
  deal,
  stage,
  onMove,
  onRemove,
}: {
  deal: any;
  stage: string;
  onMove: (fromStage: string, toStage: string) => void;
  onRemove: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const scoreRange = deal.deals?.overall_score ? getScoreRange(deal.deals.overall_score) : null;
  const stageIndex = STAGES.findIndex((s) => s.id === stage);

  const handleMoveLeft = () => {
    if (stageIndex > 0) {
      onMove(stage, STAGES[stageIndex - 1].id);
    }
  };

  const handleMoveRight = () => {
    if (stageIndex < STAGES.length - 1) {
      onMove(stage, STAGES[stageIndex + 1].id);
    }
  };

  const notePreview = deal.notes ? deal.notes.substring(0, 60) + (deal.notes.length > 60 ? '...' : '') : '';
  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm truncate">
            {deal.deals?.company_name || 'Unknown Company'}
          </h4>
          {deal.deals?.industry && (
            <p className="text-xs text-gray-500 mt-1">{deal.deals.industry}</p>
          )}
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* AI Score Badge */}
      {scoreRange && (
        <div className="mb-2">
          <div
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${scoreRange.bgColor}`}
          >
            <span className={scoreRange.textColor}>
              Score: {deal.deals?.overall_score}
            </span>
          </div>
        </div>
      )}

      {/* Notes Preview */}
      {notePreview && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{notePreview}</p>
      )}

      {/* Follow-up Date */}
      {deal.follow_up_date && (
        <p className="text-xs text-blue-600 mb-3">
          Follow-up: {formatDate(deal.follow_up_date)}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mb-3">
        <Link href={`/deals/${deal.deal_id}`} className="flex-1">
          <button className="w-full px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
            <Eye className="h-3 w-3" />
            View
          </button>
        </Link>
        <button
          onClick={onRemove}
          className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Move Stage Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleMoveLeft}
          disabled={stageIndex === 0}
          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Move to previous stage"
        >
          <ChevronLeft className="h-3 w-3 text-gray-600" />
        </button>
        <span className="text-xs text-gray-500 font-medium flex-1 text-center">
          {STAGES[stageIndex]?.label}
        </span>
        <button
          onClick={handleMoveRight}
          disabled={stageIndex === STAGES.length - 1}
          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Move to next stage"
        >
          <ChevronRight className="h-3 w-3 text-gray-600" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-4 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left">
            <MessageSquare className="h-4 w-4" />
            Add Notes
          </button>
          <button
            onClick={() => {
              onRemove();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 text-left border-t border-gray-200"
          >
            <Trash2 className="h-4 w-4" />
            Remove from Pipeline
          </button>
        </div>
      )}
    </div>
  );
}

export function PipelineKanban({
  data,
  isLoading = false,
  onRefresh,
  onMoveStage,
  onRemove,
}: PipelineKanbanProps) {
  const [movingDeal, setMovingDeal] = useState<{ dealId: string; fromStage: string } | null>(null);
  const [removingDeal, setRemovingDeal] = useState<string | null>(null);

  const handleMoveStage = async (dealId: string, fromStage: string, toStage: string) => {
    setMovingDeal({ dealId, fromStage });
    try {
      const response = await fetch(`/api/pipeline/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stage: toStage }),
      });
      if (response.ok) {
        onMoveStage?.(dealId, fromStage, toStage);
      }
    } catch (error) {
      console.error('Error moving deal:', error);
    } finally {
      setMovingDeal(null);
    }
  };

  const handleRemoveDeal = async (dealId: string) => {
    setRemovingDeal(dealId);
    try {
      const response = await fetch(`/api/pipeline/${dealId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onRemove?.(dealId);
      }
    } catch (error) {
      console.error('Error removing deal:', error);
    } finally {
      setRemovingDeal(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STAGES.map((stage) => (
          <div key={stage.id} className="space-y-3">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {STAGES.map((stage) => {
        const stageDeals = data[stage.id as keyof PipelineStageData] || [];

        return (
          <div key={stage.id} className={`${stage.color} rounded-lg border-2 ${stage.borderColor} p-4 min-h-96`}>
            {/* Stage Header */}
            <div className="mb-4">
              <h3 className="font-bold text-gray-900">{stage.label}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {stageDeals.length} {stageDeals.length === 1 ? 'deal' : 'deals'}
              </p>
            </div>

            {/* Cards Container */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stageDeals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No deals in {stage.label.toLowerCase()}</p>
                  <p className="text-xs mt-1">Add deals from the marketplace</p>
                </div>
              ) : (
                stageDeals.map((deal) => (
                  <PipelineDealCard
                    key={deal.id}
                    deal={deal}
                    stage={stage.id}
                    onMove={(fromStage, toStage) =>
                      handleMoveStage(deal.deal_id, fromStage, toStage)
                    }
                    onRemove={() => handleRemoveDeal(deal.deal_id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
