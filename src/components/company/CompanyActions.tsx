'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { Heart, HeartOff, Plus, Check, Pencil, Send, Copy, Clock, CheckCircle2, Circle, Loader2, Trash2, Share2 } from 'lucide-react';
import EditCompanyModal from './EditCompanyModal';
import { DeleteCompanyModal } from './DeleteCompanyModal';
import { ShareProfileModal } from './ShareProfileModal';
import { useTenant } from '@/components/TenantProvider';
import { tenantFetch } from '@/lib/tenant-fetch';

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
  company_linkedin_url?: string | null
  logo_url?: string | null
  raise_amount: number | string | null
  team_size: number | null
  founded_year: number | null
  founder_name: string | null
  founder_title: string | null
  is_raising?: boolean | null
  raising_amount?: string | null
  raising_instrument?: string | null
  raising_target_close?: string | null
  added_by: string | null
  user_id: string | null
}

interface CompanyActionsProps {
  companyId: string;
  company?: CompanyData;
  claimStatus?: string | null;
  claimToken?: string | null;
  claimInvitedEmail?: string | null;
  overallScore?: number | null;
}

export function CompanyActions({ companyId, company, claimStatus: initialClaimStatus, claimToken, claimInvitedEmail, overallScore }: CompanyActionsProps) {
  const { isTenantContext } = useTenant();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInvestor, setIsInvestor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isAddedBy, setIsAddedBy] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [inPipeline, setInPipeline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Claim UI state
  const [currentClaimStatus, setCurrentClaimStatus] = useState(initialClaimStatus || 'unclaimed');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

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
        if (company.added_by === user.id) {
          setIsAddedBy(true);
          // Fetch live claim status
          fetch(`/api/companies/${companyId}/claim-invite`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) {
                setCurrentClaimStatus(data.claim_status || 'unclaimed');
                if (data.pending_request) {
                  setHasPendingRequest(true);
                }
              }
            })
            .catch(() => {});
        }
      }

      // Check if user is an investor or the company owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, is_admin')
        .eq('user_id', user.id)
        .single();

      if (profile?.is_admin === true) {
        setIsAdmin(true);
      }

      // Tenant admin check — any entity admin can manage claim invites
      if (isTenantContext) {
        tenantFetch('/api/tenant/admin-check')
          .then((r) => r.ok ? r.json() : { isAdmin: false })
          .then((d) => setIsTenantAdmin(!!d.isAdmin))
          .catch(() => {});
      }

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

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      let res: Response;
      if (isTenantAdmin && isTenantContext) {
        // Use tenant claim invite API — works for any entity admin
        res = await tenantFetch('/api/tenant/claim-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyPageId: companyId, founderEmail: inviteEmail }),
        });
      } else {
        // Legacy investor-added claim invite
        res = await fetch(`/api/companies/${companyId}/claim-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail }),
        });
      }
      if (res.ok) {
        setCurrentClaimStatus('invite_sent');
        setShowInviteForm(false);
        setInviteEmail('');
      } else {
        const d = await res.json().catch(() => ({}));
        console.error('Send invite failed:', d.error || res.status);
      }
    } catch (err) {
      console.error('Send invite error:', err);
    }
    setInviteLoading(false);
  };

  const handleCopyLink = async () => {
    if (!claimToken) return;
    try {
      await navigator.clipboard.writeText(`https://www.kunfa.ai/claim/${claimToken}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  // Claim status badge config
  const claimBadge = (() => {
    if (currentClaimStatus === 'claimed') return { label: 'Claimed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    if (hasPendingRequest) return { label: 'Pending Review', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <Clock className="w-3.5 h-3.5" /> };
    if (currentClaimStatus === 'invite_sent') return { label: 'Invite Sent', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Send className="w-3.5 h-3.5" /> };
    return { label: 'Unclaimed', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: <Circle className="w-3.5 h-3.5" /> };
  })();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* Claim status badge — visible to investor who added the company OR tenant admin */}
        {(isAddedBy || isTenantAdmin) && (claimToken || isTenantAdmin) && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${claimBadge.color}`}>
            {claimBadge.icon}
            {claimBadge.label}
          </span>
        )}

        {/* Edit button — for added_by or owner */}
        {canEdit && company && (
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#007CF8] text-[#007CF8] bg-white hover:bg-blue-50 transition"
          >
            <Pencil className="w-4 h-4" />
            Edit Company
          </button>
        )}

        {/* Share button — for owner or entity admin */}
        {(isOwner || isTenantAdmin || canEdit) && company && (
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <Share2 className="w-4 h-4" />
            Share Profile
          </button>
        )}

        {/* Delete button — entity admins only */}
        {isTenantAdmin && company && (
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 bg-white hover:bg-red-50 transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}

        {/* Claim invite actions — for investor who added OR tenant admin, when not yet claimed */}
        {(isAddedBy || isTenantAdmin) && currentClaimStatus !== 'claimed' && (
          <>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              <Send className="w-4 h-4 text-gray-500" />
              {currentClaimStatus === 'invite_sent' ? 'Resend Invite' : 'Send Claim Invite'}
            </button>
            {claimToken && (
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                <Copy className="w-4 h-4 text-gray-500" />
                {copied ? 'Copied!' : 'Copy Invite Link'}
              </button>
            )}
          </>
        )}

        {/* Investor-only actions — hidden if company score < 75 and user is not admin (KUN-21) */}
        {isInvestor && (isAdmin || (overallScore ?? 0) >= 75) && (
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
                  ? 'bg-blue-50 text-[#007CF8] border border-blue-200'
                  : 'bg-[#007CF8] text-white hover:bg-[#0066D6]'
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

      {/* Invite form (inline) */}
      {showInviteForm && isAddedBy && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="founder@company.com"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] w-64"
          />
          <button
            onClick={handleSendInvite}
            disabled={inviteLoading || !inviteEmail}
            className="px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition disabled:opacity-50"
          >
            {inviteLoading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      )}

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

      {/* Delete Modal */}
      {isTenantAdmin && company && (
        <DeleteCompanyModal
          companyId={companyId}
          companyName={company.company_name}
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => {
            setDeleteOpen(false);
            window.location.href = '/deals';
          }}
        />
      )}

      {/* Share Modal */}
      {company && (
        <ShareProfileModal
          companyId={companyId}
          companyName={company.company_name}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}
