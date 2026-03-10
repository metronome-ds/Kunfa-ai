import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * GET /api/pipeline
 * Returns investor's watchlist items AND deals, both joined with company_pages
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

    // Look up profile id (investor_id in watchlist_items is profiles.id, not auth.uid())
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const profileId = profile?.id;

    // Fetch watchlist items joined with company_pages
    const { data: watchlistItems, error: wlError } = await supabase
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
          one_liner
        )
      `)
      .eq('investor_id', profileId || '')
      .order('created_at', { ascending: false });

    if (wlError) {
      console.error('Error fetching watchlist:', wlError);
    }

    // Fetch deals joined with company_pages (include all management fields)
    const { data: deals, error: dealsError } = await supabase
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
          pdf_url
        )
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (dealsError) {
      console.error('Error fetching pipeline deals:', dealsError);
      return NextResponse.json({ error: 'Failed to fetch pipeline deals' }, { status: 500 });
    }

    // Format watchlist
    const watchlist = (watchlistItems || []).map((item) => {
      const company = item.company_pages as any;
      return {
        id: item.id,
        company_id: item.company_id,
        company_name: company?.company_name || 'Unknown',
        slug: company?.slug || null,
        industry: company?.industry || null,
        overall_score: company?.overall_score || null,
        one_liner: company?.one_liner || null,
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
        });
      }
    });

    return NextResponse.json({
      watchlist,
      deals: grouped,
      total: deals?.length || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/pipeline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
