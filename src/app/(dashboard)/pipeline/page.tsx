'use client';

import { useEffect, useState, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { GripVertical, Bookmark, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface WatchlistCard {
  id: string;
  company_id: string;
  company_name: string;
  slug: string | null;
  industry: string | null;
  overall_score: number | null;
  one_liner: string | null;
}

interface DealCard {
  id: string;
  company_id: string;
  stage: string;
  company_name: string;
  slug: string | null;
  ai_score: number | null;
  sector: string | null;
  industry: string | null;
  raise_amount: number | null;
  one_liner: string | null;
  days_in_stage: number;
  notes: string | null;
}

interface PipelineStages {
  sourced: DealCard[];
  screening: DealCard[];
  due_diligence: DealCard[];
  term_sheet: DealCard[];
  closed: DealCard[];
}

type DragItem =
  | { type: 'watchlist'; card: WatchlistCard }
  | { type: 'deal'; card: DealCard; fromStage: string };

const PIPELINE_STAGES = [
  { key: 'sourced', label: 'Sourced', color: 'bg-gray-500' },
  { key: 'screening', label: 'Screening', color: 'bg-blue-500' },
  { key: 'due_diligence', label: 'Due Diligence', color: 'bg-purple-500' },
  { key: 'term_sheet', label: 'Term Sheet', color: 'bg-amber-500' },
  { key: 'closed', label: 'Closed', color: 'bg-green-500' },
] as const;

function getScoreBadgeColor(score: number | null) {
  if (!score) return 'bg-gray-100 text-gray-500';
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-blue-100 text-blue-700';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

function truncate(text: string | null, max: number) {
  if (!text) return null;
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export default function PipelinePage() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistCard[]>([]);
  const [deals, setDeals] = useState<PipelineStages>({
    sourced: [],
    screening: [],
    due_diligence: [],
    term_sheet: [],
    closed: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const fetchPipeline = async () => {
    try {
      const response = await fetch('/api/pipeline');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setWatchlist(result.watchlist || []);
      setDeals(result.deals || { sourced: [], screening: [], due_diligence: [], term_sheet: [], closed: [] });
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

  // --- Drag handlers ---
  const handleDragStartWatchlist = (card: WatchlistCard) => {
    setDragItem({ type: 'watchlist', card });
  };

  const handleDragStartDeal = (card: DealCard, fromStage: string) => {
    setDragItem({ type: 'deal', card, fromStage });
  };

  const handleDragOver = (e: DragEvent, column: string) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDropOnPipelineStage = async (e: DragEvent, toStage: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!dragItem) return;

    if (dragItem.type === 'watchlist') {
      const { card } = dragItem;
      setDragItem(null);

      const optimisticDeal: DealCard = {
        id: 'temp-' + card.company_id,
        company_id: card.company_id,
        stage: toStage,
        company_name: card.company_name,
        slug: card.slug,
        ai_score: card.overall_score,
        sector: card.industry,
        industry: card.industry,
        raise_amount: null,
        one_liner: card.one_liner,
        days_in_stage: 0,
        notes: null,
      };

      setDeals((prev) => ({
        ...prev,
        [toStage]: [optimisticDeal, ...prev[toStage as keyof PipelineStages]],
      }));

      try {
        const createRes = await fetch('/api/pipeline/move-to-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: card.company_id }),
        });

        if (!createRes.ok) {
          fetchPipeline();
          return;
        }

        const createData = await createRes.json();
        const dealId = createData.data?.id;

        if (toStage !== 'sourced' && dealId) {
          await fetch(`/api/pipeline/${dealId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage: toStage }),
          });
        }

        fetchPipeline();
      } catch {
        fetchPipeline();
      }
    } else {
      const { card, fromStage } = dragItem;
      setDragItem(null);

      if (fromStage === toStage) return;

      setDeals((prev) => {
        const newDeals = { ...prev };
        newDeals[fromStage as keyof PipelineStages] = prev[fromStage as keyof PipelineStages].filter(
          (d) => d.id !== card.id
        );
        newDeals[toStage as keyof PipelineStages] = [
          { ...card, stage: toStage, days_in_stage: 0 },
          ...prev[toStage as keyof PipelineStages],
        ];
        return newDeals;
      });

      try {
        const res = await fetch(`/api/pipeline/${card.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: toStage }),
        });
        if (!res.ok) fetchPipeline();
      } catch {
        fetchPipeline();
      }
    }
  };

  const handleDropOnWatchlist = (e: DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDragItem(null);
  };

  const totalDeals = Object.values(deals).reduce((sum, arr) => sum + arr.length, 0);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 min-h-[400px]">
              <div className="h-6 bg-gray-200 rounded w-20 mb-4 animate-pulse" />
              {[1, 2].map((j) => (
                <div key={j} className="bg-gray-50 rounded-lg p-3 mb-2 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
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
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-500 text-sm mt-1">
            {watchlist.length} watchlisted &middot; {totalDeals} deal{totalDeals !== 1 ? 's' : ''} in pipeline
          </p>
        </div>
        <Link
          href="/deals"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          Browse Companies
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      {/* Kanban Board: 6 columns */}
      <div className="grid grid-cols-6 gap-3 min-h-[500px]">
        {/* Watchlist Column */}
        <div
          onDragOver={(e) => handleDragOver(e, 'watchlist')}
          onDragLeave={handleDragLeave}
          onDrop={handleDropOnWatchlist}
          className={`rounded-xl p-3 transition-colors ${
            dragOverColumn === 'watchlist' ? 'bg-amber-50 ring-2 ring-amber-300' : 'bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2 mb-4 px-1">
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Watchlist</h3>
            <span className="text-xs text-gray-500 ml-auto">{watchlist.length}</span>
          </div>

          <div className="space-y-2">
            {watchlist.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStartWatchlist(item)}
                onClick={() => item.slug && router.push(`/company/${item.slug}`)}
                className="bg-white rounded-lg p-3 border border-gray-200 hover:border-amber-300 cursor-grab active:cursor-grabbing transition group shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate flex-1">{item.company_name}</h4>
                  <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5" />
                </div>

                {item.overall_score !== null && (
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded mt-2 ${getScoreBadgeColor(item.overall_score)}`}>
                    Score: {item.overall_score}
                  </span>
                )}

                {item.industry && (
                  <div className="mt-2">
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {item.industry}
                    </span>
                  </div>
                )}

                {item.one_liner && (
                  <p className="text-[10px] text-gray-500 mt-2 line-clamp-2">
                    {truncate(item.one_liner, 80)}
                  </p>
                )}
              </div>
            ))}

            {watchlist.length === 0 && (
              <div className="text-center py-8 px-2">
                <p className="text-gray-500 text-xs mb-3">No companies watchlisted yet.</p>
                <Link
                  href="/deals"
                  className="text-blue-600 text-xs hover:text-blue-800 underline"
                >
                  Browse companies
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Stage Columns */}
        {PIPELINE_STAGES.map((stage) => {
          const cards = deals[stage.key as keyof PipelineStages];
          const isDragOver = dragOverColumn === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropOnPipelineStage(e, stage.key)}
              className={`rounded-xl p-3 transition-colors ${
                isDragOver ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                <h3 className="text-sm font-semibold text-gray-900">{stage.label}</h3>
                <span className="text-xs text-gray-500 ml-auto">{cards.length}</span>
              </div>

              <div className="space-y-2">
                {cards.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStartDeal(deal, stage.key)}
                    onClick={() => deal.slug && router.push(`/company/${deal.slug}`)}
                    className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 cursor-grab active:cursor-grabbing transition group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate flex-1">{deal.company_name}</h4>
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5" />
                    </div>

                    {deal.ai_score !== null && (
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded mt-2 ${getScoreBadgeColor(deal.ai_score)}`}>
                        Score: {deal.ai_score}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {(deal.industry || deal.sector) && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {deal.industry || deal.sector}
                        </span>
                      )}
                    </div>

                    {deal.one_liner && (
                      <p className="text-[10px] text-gray-500 mt-2 line-clamp-2">
                        {truncate(deal.one_liner, 80)}
                      </p>
                    )}

                    <p className="text-[10px] text-gray-400 mt-2">
                      {deal.days_in_stage}d in stage
                    </p>
                  </div>
                ))}

                {cards.length === 0 && (
                  <div className="text-center py-8 px-2">
                    <p className="text-gray-500 text-xs">
                      {stage.key === 'sourced'
                        ? 'Drag from watchlist or browse companies'
                        : 'No deals'}
                    </p>
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
