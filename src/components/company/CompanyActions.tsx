'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { Heart, HeartOff, Plus, Check } from 'lucide-react';

interface CompanyActionsProps {
  companyId: string;
}

export function CompanyActions({ companyId }: CompanyActionsProps) {
  const [isInvestor, setIsInvestor] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [inPipeline, setInPipeline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is an investor
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role !== 'investor') {
        setLoading(false);
        return;
      }

      setIsInvestor(true);

      // Look up profile id (investor_id in watchlist_items is profiles.id, not auth user id)
      const { data: watchlistItem } = await supabase
        .from('watchlist_items')
        .select('id')
        .eq('investor_id', profile.id)
        .eq('company_id', companyId)
        .single();

      setIsWatchlisted(!!watchlistItem);

      // Check pipeline status
      const { data: deal } = await supabase
        .from('deals')
        .select('id')
        .eq('created_by', user.id)
        .eq('company_id', companyId)
        .single();

      setInPipeline(!!deal);
      setLoading(false);
    }

    checkAuth();
  }, [companyId]);

  if (loading || !isInvestor) return null;

  const toggleWatchlist = async () => {
    const wasWatchlisted = isWatchlisted;
    setIsWatchlisted(!wasWatchlisted); // optimistic
    setWatchlistLoading(true);
    try {
      const method = wasWatchlisted ? 'DELETE' : 'POST';
      const res = await fetch('/api/watchlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) setIsWatchlisted(wasWatchlisted); // revert on failure
    } catch (err) {
      console.error('Watchlist toggle error:', err);
      setIsWatchlisted(wasWatchlisted); // revert on error
    } finally {
      setWatchlistLoading(false);
    }
  };

  const addToPipeline = async () => {
    setPipelineLoading(true);
    try {
      const res = await fetch('/api/pipeline/add-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) setInPipeline(true);
    } catch (err) {
      console.error('Pipeline add error:', err);
    } finally {
      setPipelineLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleWatchlist}
        disabled={watchlistLoading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
          isWatchlisted
            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        {isWatchlisted ? (
          <>
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            Watchlisted
          </>
        ) : (
          <>
            <HeartOff className="h-4 w-4" />
            Add to Watchlist
          </>
        )}
      </button>

      <button
        onClick={addToPipeline}
        disabled={pipelineLoading || inPipeline}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
          inPipeline
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {inPipeline ? (
          <>
            <Check className="h-4 w-4" />
            In Pipeline
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Add to Pipeline
          </>
        )}
      </button>
    </div>
  );
}
