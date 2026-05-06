import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getEntityContextByAuthId } from '@/lib/entity-context';
import { NextResponse } from 'next/server';

/**
 * GET /api/pipeline
 * Returns investor's watchlist items AND deals, both joined with company_pages.
 * Uses entity context (new) with fallback to user-scoped queries (legacy).
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up profile id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const profileId = profile?.id;

    // Resolve entity context for dual-read
    const entityCtx = await getEntityContextByAuthId(user.id);
    const entityId = entityCtx.effectiveEntityId;

    // Fetch watchlist items: entity-scoped or user-scoped
    let watchlistQuery = supabase
      .from('watchlist_items')
      .select(`
        id,
        company_id,
        created_at,
        company_pages!company_id (
          company_name,
          slug,
          industry,
          overall_score,
          one_liner,
          logo_url,
          is_raising,
          raising_amount,
          raising_target_close
        )
      `)
      .order('created_at', { ascending: false });

    if (entityId) {
      watchlistQuery = watchlistQuery.eq('entity_id', entityId);
    } else {
      watchlistQuery = watchlistQuery.eq('investor_id', profileId || '');
    }

    const { data: watchlistItems, error: wlError } = await watchlistQuery;

    if (wlError) {
      console.error('Error fetching watchlist:', wlError);
    }

    // Fetch deals: entity-scoped or user-scoped
    let dealsQuery = supabase
      .from('deals')
      .select(`
        id,
        company_id,
        stage,
        ai_score,
        sector,
        raise_amount,
        days_in_stage,
        stage_changed_at,
        notes,
        priority_flag,
        next_action,
        next_action_date,
        deal_size,
        source,
        thesis_fit,
        contact_name,
        contact_email,
        assigned_to_name,
        valuation_pre,
        valuation_post,
        lead_investor,
        co_investors,
        round_type,
        created_at,
        company_pages!company_id (
          company_name,
          slug,
          industry,
          stage,
          overall_score,
          one_liner,
          description,
          pdf_url,
          logo_url,
          is_raising,
          raising_amount,
          raising_target_close
        )
      `)
      .order('created_at', { ascending: false });

    if (entityId) {
      dealsQuery = dealsQuery.eq('entity_id', entityId);
    } else {
      dealsQuery = dealsQuery.eq('created_by', user.id);
    }

    const { data: deals, error: dealsError } = await dealsQuery;

    if (dealsError) {
      console.error('Error fetching pipeline deals:', dealsError);
      return NextResponse.json({ error: 'Failed to fetch pipeline deals' }, { status: 500 });
    }

    // Fetch note counts for all deals in one query
    const dealIds = (deals || []).map((d) => d.id);
    let noteCountMap: Record<string, number> = {};
    if (dealIds.length > 0) {
      const { data: noteCounts } = await supabase
        .rpc('get_deal_note_counts', { deal_ids: dealIds });

      if (noteCounts) {
        for (const row of noteCounts) {
          noteCountMap[row.deal_id] = row.note_count;
        }
      } else {
        // Fallback: query directly
        const { data: noteRows } = await supabase
          .from('deal_notes')
          .select('deal_id')
          .in('deal_id', dealIds);

        if (noteRows) {
          for (const row of noteRows) {
            noteCountMap[row.deal_id] = (noteCountMap[row.deal_id] || 0) + 1;
          }
        }
      }
    }

    // Fetch invited companies (source = 'investor_invited', added_by = current user)
    const { data: invitedCompanies } = await supabase
      .from('company_pages')
      .select('id, company_name, slug, claim_status, claim_invited_email, claim_token, created_at, overall_score')
      .eq('added_by', user.id)
      .eq('source', 'investor_invited')
      .order('created_at', { ascending: false });

    // Format invites
    const invites = (invitedCompanies || []).map((c) => ({
      id: c.id,
      company_name: c.company_name,
      slug: c.slug,
      claim_status: c.claim_status || 'invite_sent',
      invited_email: c.claim_invited_email,
      claim_token: c.claim_token,
      created_at: c.created_at,
      overall_score: c.overall_score,
    }));

    // Collect company_ids that already have a pipeline deal — these should NOT
    // appear in the Watchlist column (avoids showing the same company twice).
    const dealCompanyIds = new Set(
      (deals || []).filter(d => d.company_id).map(d => d.company_id),
    );

    // Format watchlist, excluding companies already in a pipeline stage
    const watchlist = (watchlistItems || [])
      .filter((item) => !dealCompanyIds.has(item.company_id))
      .map((item) => {
        const company = item.company_pages as any;
        return {
          id: item.id,
          company_id: item.company_id,
          company_name: company?.company_name || 'Unknown',
          slug: company?.slug || null,
          industry: company?.industry || null,
          overall_score: company?.overall_score || null,
          one_liner: company?.one_liner || null,
          logo_url: company?.logo_url || null,
          is_raising: company?.is_raising || false,
          raising_amount: company?.raising_amount || null,
          raising_target_close: company?.raising_target_close || null,
        };
      });

    // Group deals by stage
    const grouped: Record<string, any[]> = {
      sourced: [],
      screening: [],
      due_diligence: [],
      term_sheet: [],
      closed: [],
    };

    deals?.forEach((deal) => {
      const stage = deal.stage;
      if (stage && stage in grouped) {
        const stageChanged = deal.stage_changed_at ? new Date(deal.stage_changed_at) : new Date(deal.created_at);
        const daysInStage = Math.floor((Date.now() - stageChanged.getTime()) / (1000 * 60 * 60 * 24));

        const company = deal.company_pages as any;
        grouped[stage].push({
          id: deal.id,
          company_id: deal.company_id,
          stage: deal.stage,
          company_name: company?.company_name || 'Unknown',
          slug: company?.slug || null,
          ai_score: deal.ai_score || company?.overall_score || null,
          sector: deal.sector || company?.industry || null,
          industry: company?.industry || null,
          company_stage: company?.stage || null,
          raise_amount: deal.raise_amount || company?.raise_amount || null,
          one_liner: company?.one_liner || null,
          description: company?.description || null,
          pdf_url: company?.pdf_url || null,
          logo_url: company?.logo_url || null,
          days_in_stage: daysInStage,
          stage_changed_at: deal.stage_changed_at,
          notes: deal.notes,
          priority_flag: deal.priority_flag || false,
          next_action: deal.next_action || null,
          next_action_date: deal.next_action_date || null,
          deal_size: deal.deal_size || null,
          source: deal.source || null,
          thesis_fit: deal.thesis_fit || null,
          contact_name: deal.contact_name || null,
          contact_email: deal.contact_email || null,
          assigned_to_name: deal.assigned_to_name || null,
          valuation_pre: deal.valuation_pre || null,
          valuation_post: deal.valuation_post || null,
          lead_investor: deal.lead_investor || null,
          co_investors: deal.co_investors || null,
          round_type: deal.round_type || null,
          is_raising: company?.is_raising || false,
          raising_amount: company?.raising_amount || null,
          raising_target_close: company?.raising_target_close || null,
          note_count: noteCountMap[deal.id] || 0,
        });
      }
    });

    return NextResponse.json({
      watchlist,
      deals: grouped,
      invites,
      total: deals?.length || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/pipeline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
