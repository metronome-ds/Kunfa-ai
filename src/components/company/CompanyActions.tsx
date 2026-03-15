'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { Heart, HeartOff, Plus, Check, FileText, Pencil } from 'lucide-react';
import EditCompanyModal from './EditCompanyModal';

interface CompanyData {
  id: string
  company_name: string
  one_liner: string | null
  description: string | null
  industry: string | null
  stage: string | null
  country: string | null
  headquarters: string | null
  website_url: string | null
  linkedin_url: string | null
  raise_amount: number | string | null
  team_size: number | null
  founded_year: number | null
  founder_name: string | null
  founder_title: string | null
  added_by: string | null
  user_id: string | null
}

interface CompanyActionsProps {
  companyId: string;
  hasPitchDeck?: boolean;
  pdfUrl?: string | null;
  company?: CompanyData;
}

export function CompanyActions({ companyId, hasPitchDeck = false, pdfUrl, company }: CompanyActionsProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInvestor, setIsInvestor] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [inPipeline, setInPipeline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Check if current user can edit (added_by or user_id match)
      if (company) {
        if (company.added_by === user.id || company.user_id === user.id) {
          setCanEdit(true);
        }
      }

      // Check if user is an investor or the company owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      // Check if this user owns this company page
      const { data: ownedCompany } = await supabase
        .from('company_pages')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (ownedCompany) {
        setIsOwner(true);
        setCanEdit(true);
      }

      // Also check added_by if we didn't have company prop
      if (!company) {
        const { data: addedCompany } = await supabase
          .from('company_pages')
          .select('id')
          .eq('id', companyId)
          .eq('added_by', user.id)
          .maybeSingle();

        if (addedCompany) {
          setCanEdit(true);
        }
      }

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
  }, [companyId, company]);

  if (loading) return null;

  // Unauthenticated users see nothing
  if (!isAuthenticated) return null;

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

  // Show pitch deck button for owners and investors (proxied, auth-gated)
  const showPitchDeck = hasPitchDeck && (isOwner || isInvestor);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* Edit button — for added_by or owner */}
        {canEdit && company && (
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#0168FE] text-[#0168FE] bg-white hover:bg-blue-50 transition"
          >
            <Pencil className="w-4 h-4" />
            Edit Company
          </button>
        )}

        {/* Pitch deck button — direct blob URL */}
        {showPitchDeck && pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <FileText className="w-4 h-4 text-gray-500" />
            View Pitch Deck
          </a>
        )}

        {/* Investor-only actions */}
        {isInvestor && (
          <>
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
                  ? 'bg-blue-50 text-[#0168FE] border border-blue-200'
                  : 'bg-[#0168FE] text-white hover:bg-[#0050CC]'
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
          </>
        )}
      </div>

      {/* Edit Modal */}
      {canEdit && company && (
        <EditCompanyModal
          company={company}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
