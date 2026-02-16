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

    // Fetch deals created by user with engagement stats
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select(
        `
        id,
        title,
        company_name,
        website,
        description,
        industry,
        stage,
        status,
        funding_amount,
        valuation,
        deal_type,
        problem_statement,
        solution,
        market_size,
        team_size,
        ai_score_overall,
        ai_score_team,
        ai_score_market,
        ai_score_traction,
        ai_score_product,
        ai_score_financials,
        ai_score_competitive_landscape,
        ai_score_metadata,
        view_count,
        save_count,
        created_at,
        updated_at
      `
      )
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (dealsError) {
      console.error('Error fetching my deals:', dealsError);
      return NextResponse.json(
        { error: 'Failed to fetch deals' },
        { status: 500 }
      );
    }

    // Get engagement stats for each deal
    const dealsWithStats = await Promise.all(
      (deals || []).map(async (deal) => {
        const { data: engagement, error: engError } = await supabase
          .from('engagement_scores')
          .select('views, score')
          .eq('deal_id', deal.id);

        const stats = engagement?.reduce(
          (acc, e) => ({
            views: (acc.views || 0) + (e.views || 0),
            saves: (acc.saves || 0) + ((e as any).score || 0),
          }),
          { views: 0, saves: 0 }
        ) || { views: 0, saves: 0 };

        return {
          ...deal,
          views: stats.views,
          saves: stats.saves,
        };
      })
    );

    return NextResponse.json(
      { data: dealsWithStats },
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
