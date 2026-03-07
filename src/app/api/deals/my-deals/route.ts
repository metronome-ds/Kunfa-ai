import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/deals/my-deals
 * Get deals created by the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select(
        `
        id,
        created_by,
        company_id,
        stage,
        ai_score,
        sector,
        raise_amount,
        priority_flag,
        is_watchlisted,
        days_in_stage,
        stage_changed_at,
        notes,
        created_at,
        updated_at,
        company_pages!company_id (
          id,
          company_name,
          slug,
          description,
          overall_score,
          industry,
          stage,
          raise_amount
        )
      `
      )
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (dealsError) {
      console.error('Error fetching my deals:', dealsError);
      return NextResponse.json(
        { error: 'Failed to fetch deals' },
        { status: 500 }
      );
    }

    // Flatten company_pages data for the frontend
    const flatDeals = (deals || []).map((deal) => {
      const company = deal.company_pages as any;
      return {
        id: deal.id,
        company_name: company?.company_name || 'Unknown',
        industry: company?.industry || deal.sector || 'N/A',
        stage: deal.stage,
        ai_score_overall: deal.ai_score || company?.overall_score || null,
        slug: company?.slug,
        description: company?.description,
        raise_amount: deal.raise_amount || company?.raise_amount,
        created_at: deal.created_at,
        updated_at: deal.updated_at,
        status: 'active',
      };
    });

    return NextResponse.json(
      { data: flatDeals },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/deals/my-deals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
