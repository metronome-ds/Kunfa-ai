'use client';

import { useEffect, useState, DragEvent } from 'react';
import { GripVertical, Bookmark, ArrowRight, Star, CalendarDays, Mail, RefreshCw, ChevronDown, ChevronUp, Check, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import DealSlideout from '@/components/pipeline/DealSlideout';
import CompanyLogo from '@/components/common/CompanyLogo';
import { getRaisingUrgency } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

type DealFilter = 'all' | 'mine' | 'unassigned';

interface WatchlistCard {
  id: string;
  company_id: string;
  company_name: string;
  slug: string | null;
  industry: string | null;
  overall_score: number | null;
  one_liner: string | null;
  logo_url: string | null;
  is_raising: boolean;
  raising_amount: string | null;
  raising_target_close: string | null;
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
  company_stage: string | null;
  raise_amount: number | null;
  one_liner: string | null;
  description: string | null;
  pdf_url: string | null;
  logo_url: string | null;
  days_in_stage: number;
  notes: string | null;
  priority_flag: boolean;
  next_action: string | null;
  next_action_date: string | null;
  deal_size: number | null;
  source: string | null;
  thesis_fit: string | null;
  contact_name: string | null;
  contact_email: string | null;
  assigned_to_name: string | null;
  valuation_pre: number | null;
  valuation_post: number | null;
  lead_investor: string | null;
  co_investors: string | null;
  round_type: string | null;
  is_raising: boolean;
  raising_amount: string | null;
  raising_target_close: string | null;
}

interface PipelineStages {
  sourced: DealCard[];
  screening: DealCard[];
  due_diligence: DealCard[];
  term_sheet: DealCard[];
  closed: DealCard[];
}

interface InviteCard {
  id: string;
  company_name: string;
  slug: string | null;
  claim_status: string;
  invited_email: string | null;
  claim_token: string | null;
  created_at: string;
  overall_score: number | null;
}

type DragItem =
  | { type: 'watchlist'; card: WatchlistCard }
  | { type: 'deal'; card: DealCard; fromStage: string };

const PIPELINE_STAGES = [
  { key: 'sourced', label: 'Sourced', color: 'bg-gray-400' },
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

function formatShortDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PipelinePage() {
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
  const [selectedDeal, setSelectedDeal] = useState<DealCard | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dealFilter, setDealFilter] = useState<DealFilter>('all');
  const [ownerName, setOwnerName] = useState('');
  const [invites, setInvites] = useState<InviteCard[]>([]);
  const [showInvites, setShowInvites] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const { data } = await res.json();
        setTeamMembers(data || []);
        const owner = (data || []).find((m: TeamMember) => m.role === 'owner');
        if (owner) setOwnerName(owner.name);
      }
    } catch { /* ignore */ }
  };

  const fetchPipeline = async () => {
    try {
      const response = await fetch('/api/pipeline');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setWatchlist(result.watchlist || []);
      setDeals(result.deals || { sourced: [], screening: [], due_diligence: [], term_sheet: [], closed: [] });
      setInvites(result.invites || []);
      setError(null);

      // If a deal is selected, update it with fresh data
      if (selectedDeal) {
        const allDeals = Object.values(result.deals || {}).flat() as DealCard[];
        const updated = allDeals.find(d => d.id === selectedDeal.id);
        if (updated) setSelectedDeal(updated);
      }
    } catch {
      setError('Failed to load pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
    fetchTeam();
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
        company_stage: null,
        raise_amount: null,
        one_liner: card.one_liner,
        description: null,
        pdf_url: null,
        logo_url: card.logo_url,
        days_in_stage: 0,
        notes: null,
        priority_flag: false,
        next_action: null,
        next_action_date: null,
        deal_size: null,
        source: null,
        thesis_fit: null,
        contact_name: null,
        contact_email: null,
        assigned_to_name: null,
        valuation_pre: null,
        valuation_post: null,
        lead_investor: null,
        co_investors: null,
        round_type: null,
        is_raising: card.is_raising,
        raising_amount: card.raising_amount,
        raising_target_close: card.raising_target_close,
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

  const handleDealClick = (deal: DealCard, e: React.MouseEvent) => {
    // Don't open slideout if user is dragging
    if ((e.target as HTMLElement).closest('[data-grip]')) return;
    setSelectedDeal(deal);
  };

  // Apply filter to deals
  function filterDeals(cards: DealCard[]): DealCard[] {
    if (dealFilter === 'mine') {
      return cards.filter(d => d.assigned_to_name === ownerName);
    }
    if (dealFilter === 'unassigned') {
      return cards.filter(d => !d.assigned_to_name);
    }
    return cards;
  }

  const handleResendInvite = async (invite: InviteCard) => {
    if (!invite.invited_email || !invite.claim_token) return;
    setResendingId(invite.id);
    try {
      const res = await fetch('/api/companies/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: invite.company_name,
          founderEmail: invite.invited_email,
          resend: true,
          existingToken: invite.claim_token,
        }),
      });
      if (!res.ok) throw new Error('Failed to resend');
    } catch {
      // silently fail — UX will show button revert
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvite = async (invite: InviteCard) => {
    if (!confirm(`Cancel invite for ${invite.company_name}?`)) return;
    setCancellingId(invite.id);
    try {
      const res = await fetch('/api/companies/invite/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: invite.id }),
      });
      if (res.ok) {
        // Remove from local state
        setInvites(prev => prev.filter(i => i.id !== invite.id));
      }
    } catch {
      // ignore
    } finally {
      setCancellingId(null);
    }
  };

  function getInviteStatusBadge(invite: InviteCard) {
    if (invite.claim_status === 'claimed') {
      if (invite.overall_score) return { label: 'Scored', color: 'bg-emerald-100 text-emerald-700' };
      return { label: 'Claimed', color: 'bg-blue-100 text-blue-700' };
    }
    return { label: 'Pending', color: 'bg-amber-100 text-amber-700' };
  }

  const pendingInvites = invites.filter(i => i.claim_status !== 'claimed' || !i.overall_score);
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
                <div key={j} className="bg-[#F8F9FB] rounded-lg p-3 mb-2 animate-pulse">
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
          className="flex items-center gap-2 px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition"
        >
          Browse Companies
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-1 mb-4">
        <span className="text-xs font-medium text-gray-500 mr-2">Show:</span>
        {([
          { key: 'all', label: 'All deals' },
          { key: 'mine', label: 'My deals' },
          { key: 'unassigned', label: 'Unassigned' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setDealFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              dealFilter === f.key
                ? 'bg-[#007CF8] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Pending Invites Section */}
      {invites.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowInvites(!showInvites)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 mb-3"
          >
            <Mail className="w-4 h-4 text-[#007CF8]" />
            Pending Invites
            <span className="text-xs font-normal text-gray-500">({invites.length})</span>
            {showInvites ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showInvites && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {invites.map((invite) => {
                const badge = getInviteStatusBadge(invite);
                const dateStr = new Date(invite.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div
                    key={invite.id}
                    className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{invite.company_name}</h4>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ml-1 ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {invite.invited_email && (
                      <p className="text-[11px] text-gray-500 truncate">{invite.invited_email}</p>
                    )}

                    <p className="text-[10px] text-gray-400 mt-1">Invited {dateStr}</p>

                    {invite.overall_score !== null && (
                      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-2 ${getScoreBadgeColor(invite.overall_score)}`}>
                        Score: {invite.overall_score}
                      </span>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      {invite.claim_status !== 'claimed' && invite.invited_email && (
                        <>
                          <button
                            onClick={() => handleResendInvite(invite)}
                            disabled={resendingId === invite.id || cancellingId === invite.id}
                            className="flex items-center gap-1 text-[10px] text-[#007CF8] hover:text-[#0066D6] font-medium disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${resendingId === invite.id ? 'animate-spin' : ''}`} />
                            {resendingId === invite.id ? 'Sending...' : 'Resend'}
                          </button>
                          <button
                            onClick={() => handleCancelInvite(invite)}
                            disabled={cancellingId === invite.id || resendingId === invite.id}
                            className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            {cancellingId === invite.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        </>
                      )}
                      {invite.claim_status === 'claimed' && invite.slug && (
                        <Link
                          href={`/company/${invite.slug}`}
                          className="flex items-center gap-1 text-[10px] text-[#007CF8] hover:text-[#0066D6] font-medium"
                        >
                          <Check className="w-3 h-3" />
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Kanban Board: 6 columns */}
      <div className="grid grid-cols-6 gap-3 min-h-[500px]">
        {/* Watchlist Column */}
        <div
          onDragOver={(e) => handleDragOver(e, 'watchlist')}
          onDragLeave={handleDragLeave}
          onDrop={handleDropOnWatchlist}
          className={`rounded-xl p-3 transition-colors ${
            dragOverColumn === 'watchlist' ? 'bg-amber-50 ring-2 ring-amber-300/50' : 'bg-gray-100'
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
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('[data-grip]')) return;
                  setSelectedDeal({
                    id: 'temp-' + item.company_id,
                    company_id: item.company_id,
                    stage: 'watchlist',
                    company_name: item.company_name,
                    slug: item.slug,
                    ai_score: item.overall_score,
                    sector: item.industry,
                    industry: item.industry,
                    company_stage: null,
                    raise_amount: null,
                    one_liner: item.one_liner,
                    description: null,
                    pdf_url: null,
                    logo_url: item.logo_url,
                    days_in_stage: 0,
                    notes: null,
                    priority_flag: false,
                    next_action: null,
                    next_action_date: null,
                    deal_size: null,
                    source: null,
                    thesis_fit: null,
                    contact_name: null,
                    contact_email: null,
                    assigned_to_name: null,
                    valuation_pre: null,
                    valuation_post: null,
                    lead_investor: null,
                    co_investors: null,
                    round_type: null,
                    is_raising: item.is_raising,
                    raising_amount: item.raising_amount,
                    raising_target_close: item.raising_target_close,
                  });
                }}
                className="bg-white rounded-lg p-3 border border-gray-200 hover:border-amber-300 cursor-pointer active:cursor-grabbing transition group shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CompanyLogo name={item.company_name} logoUrl={item.logo_url} size="sm" />
                    <h4 className="text-sm font-medium text-gray-900 truncate">{item.company_name}</h4>
                  </div>
                  <GripVertical data-grip className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5" />
                </div>

                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {item.overall_score !== null && (
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${getScoreBadgeColor(item.overall_score)}`}>
                      Score: {item.overall_score}
                    </span>
                  )}
                  {item.is_raising && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {item.raising_amount ? `Raising ${item.raising_amount}` : 'Raising'}
                    </span>
                  )}
                  {(() => {
                    const u = getRaisingUrgency(item.raising_target_close, item.is_raising);
                    return u ? (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${u.color}`}>
                        <Clock className="w-2.5 h-2.5" />
                        {u.label}
                      </span>
                    ) : null;
                  })()}
                </div>

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
                  className="text-[#007CF8] text-xs hover:text-[#0066D6] underline"
                >
                  Browse companies
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Stage Columns */}
        {PIPELINE_STAGES.map((stage) => {
          const allCards = deals[stage.key as keyof PipelineStages];
          const cards = filterDeals(allCards);
          const isDragOver = dragOverColumn === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropOnPipelineStage(e, stage.key)}
              className={`rounded-xl p-3 transition-colors ${
                isDragOver ? 'bg-[#F0F7FF] ring-2 ring-[#007CF8]/30' : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                <h3 className="text-sm font-semibold text-gray-900">{stage.label}</h3>
                <span className="text-xs text-gray-500 ml-auto">
                  {cards.length}{dealFilter !== 'all' && cards.length !== allCards.length ? `/${allCards.length}` : ''}
                </span>
              </div>

              <div className="space-y-2">
                {cards.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStartDeal(deal, stage.key)}
                    onClick={(e) => handleDealClick(deal, e)}
                    className={`bg-white rounded-lg p-3 border hover:border-gray-300 cursor-pointer active:cursor-grabbing transition group shadow-sm ${
                      selectedDeal?.id === deal.id ? 'border-[#007CF8] ring-1 ring-[#007CF8]/30' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <CompanyLogo name={deal.company_name} logoUrl={deal.logo_url} size="sm" />
                        {deal.priority_flag && (
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                        )}
                        <h4 className="text-sm font-medium text-gray-900 truncate">{deal.company_name}</h4>
                      </div>
                      <GripVertical data-grip className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5" />
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {deal.ai_score !== null && (
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${getScoreBadgeColor(deal.ai_score)}`}>
                          Score: {deal.ai_score}
                        </span>
                      )}
                      {deal.is_raising && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {deal.raising_amount ? `Raising ${deal.raising_amount}` : 'Raising'}
                        </span>
                      )}
                      {(() => {
                        const u = getRaisingUrgency(deal.raising_target_close, deal.is_raising);
                        return u ? (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${u.color}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {u.label}
                          </span>
                        ) : null;
                      })()}
                    </div>

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

                    {/* Next action + date */}
                    {deal.next_action && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                        <CalendarDays className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {truncate(deal.next_action, 30)}
                          {deal.next_action_date && ` — ${formatShortDate(deal.next_action_date)}`}
                        </span>
                      </div>
                    )}

                    {/* Footer: days + assigned */}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-gray-400">
                        {deal.days_in_stage}d in stage
                      </p>
                      {deal.assigned_to_name && (
                        <span
                          className="w-5 h-5 rounded-full bg-gray-200 text-[8px] font-semibold text-gray-600 flex items-center justify-center flex-shrink-0"
                          title={deal.assigned_to_name}
                        >
                          {getInitials(deal.assigned_to_name)}
                        </span>
                      )}
                    </div>
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

      {/* Deal Slideout Panel */}
      {selectedDeal && (
        <DealSlideout
          deal={selectedDeal}
          isOpen={!!selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdated={fetchPipeline}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
}
