'use client';

import { useEffect, useState, useRef, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, GripVertical } from 'lucide-react';

interface DealCard {
  id: string;
  stage: string;
  company_name: string;
  slug?: string;
  ai_score: number | null;
  sector: string | null;
  raise_amount: number | null;
  days_in_stage: number;
  notes: string | null;
}

interface PipelineData {
  sourced: DealCard[];
  screening: DealCard[];
  due_diligence: DealCard[];
  term_sheet: DealCard[];
  closed: DealCard[];
}

const STAGES = [
  { key: 'sourced', label: 'Sourced', color: 'bg-gray-500' },
  { key: 'screening', label: 'Screening', color: 'bg-blue-500' },
  { key: 'due_diligence', label: 'Due Diligence', color: 'bg-purple-500' },
  { key: 'term_sheet', label: 'Term Sheet', color: 'bg-amber-500' },
  { key: 'closed', label: 'Closed', color: 'bg-green-500' },
] as const;

function getScoreBadgeColor(score: number | null) {
  if (!score) return 'bg-gray-700 text-gray-400';
  if (score >= 80) return 'bg-emerald-500/20 text-emerald-400';
  if (score >= 60) return 'bg-blue-500/20 text-blue-400';
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
}

function formatAmount(amount: number | null) {
  if (!amount) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function PipelinePage() {
  const router = useRouter();
  const [data, setData] = useState<PipelineData>({
    sourced: [],
    screening: [],
    due_diligence: [],
    term_sheet: [],
    closed: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<{ deal: DealCard; fromStage: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const fetchPipeline = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pipeline');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch {
      setError('Failed to load pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const handleDragStart = (deal: DealCard, fromStage: string) => {
    setDraggedDeal({ deal, fromStage });
  };

  const handleDragOver = (e: DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(stageKey);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: DragEvent, toStage: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedDeal || draggedDeal.fromStage === toStage) {
      setDraggedDeal(null);
      return;
    }

    const { deal, fromStage } = draggedDeal;

    // Optimistic update
    setData((prev) => {
      const newData = { ...prev };
      newData[fromStage as keyof PipelineData] = prev[fromStage as keyof PipelineData].filter(
        (d) => d.id !== deal.id
      );
      newData[toStage as keyof PipelineData] = [
        { ...deal, stage: toStage, days_in_stage: 0 },
        ...prev[toStage as keyof PipelineData],
      ];
      return newData;
    });

    setDraggedDeal(null);

    // API call
    try {
      const res = await fetch(`/api/pipeline/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: toStage }),
      });
      if (!res.ok) {
        // Revert on failure
        fetchPipeline();
      }
    } catch {
      fetchPipeline();
    }
  };

  const totalDeals = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Deal Pipeline</h1>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {STAGES.map((s) => (
            <div key={s.key} className="bg-gray-800/50 rounded-xl p-4 min-h-[400px]">
              <div className="h-6 bg-gray-700 rounded w-24 mb-4 animate-pulse" />
              {[1, 2].map((i) => (
                <div key={i} className="bg-gray-700/50 rounded-lg p-4 mb-3 animate-pulse">
                  <div className="h-4 bg-gray-600 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-600 rounded w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Deal Pipeline</h1>
          <p className="text-gray-400 text-sm mt-1">
            {totalDeals} deal{totalDeals !== 1 ? 's' : ''} across {STAGES.length} stages
          </p>
        </div>
        <button
          onClick={() => router.push('/companies/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4 min-h-[500px]">
        {STAGES.map((stage) => {
          const cards = data[stage.key as keyof PipelineData];
          const isDragOver = dragOverStage === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
              className={`rounded-xl p-3 transition-colors ${
                isDragOver ? 'bg-blue-900/30 ring-2 ring-blue-500/50' : 'bg-gray-800/50'
              }`}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                <h3 className="text-sm font-semibold text-white">{stage.label}</h3>
                <span className="text-xs text-gray-500 ml-auto">{cards.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {cards.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal, stage.key)}
                    className="bg-gray-900 rounded-lg p-3 border border-gray-700 hover:border-gray-600 cursor-grab active:cursor-grabbing transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-white truncate flex-1">{deal.company_name}</h4>
                      <GripVertical className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-0.5" />
                    </div>

                    {deal.ai_score !== null && (
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded mt-2 ${getScoreBadgeColor(deal.ai_score)}`}>
                        Score: {deal.ai_score}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {deal.sector && (
                        <span className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                          {deal.sector}
                        </span>
                      )}
                      {deal.raise_amount && (
                        <span className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                          {formatAmount(deal.raise_amount)}
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-gray-500 mt-2">
                      {deal.days_in_stage}d in stage
                    </p>
                  </div>
                ))}

                {cards.length === 0 && (
                  <div className="text-center py-8 text-gray-600 text-xs">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
