import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/portfolio
 * List user's portfolio holdings with deal info
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

    const { data: holdings, error } = await supabase
      .from('portfolio_holdings')
      .select(
        `
        *,
        deals (
          id,
          company_name,
          industry,
          overall_score,
          stage
        )
      `
      )
      .eq('investor_id', user.id)
      .order('invested_at', { ascending: false });

    if (error) {
      console.error('Error fetching portfolio holdings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch portfolio holdings' },
        { status: 500 }
      );
    }

    // Calculate summary stats
    const totalInvested = holdings?.reduce((sum, h) => sum + (h.investment_amount || 0), 0) || 0;
    const currentValue = holdings?.reduce((sum, h) => sum + (h.current_valuation || h.entry_valuation || 0), 0) || 0;
    const totalMultiple = totalInvested > 0 ? currentValue / totalInvested : 0;

    return NextResponse.json(
      {
        data: holdings || [],
        summary: {
          totalInvested,
          currentValue,
          totalMultiple,
          holdingsCount: holdings?.length || 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/portfolio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portfolio
 * Add new holding
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      dealId,
      investmentAmount,
      investmentDate,
      equityPercent,
      entryValuation,
    } = body;

    if (!dealId || !investmentAmount) {
      return NextResponse.json(
        { error: 'dealId and investmentAmount are required' },
        { status: 400 }
      );
    }

    // Check if already in portfolio
    const { data: existing } = await supabase
      .from('portfolio_holdings')
      .select('id')
      .eq('investor_id', user.id)
      .eq('deal_id', dealId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Deal already in portfolio' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('portfolio_holdings')
      .insert({
        investor_id: user.id,
        deal_id: dealId,
        investment_amount: investmentAmount,
        invested_at: investmentDate || new Date().toISOString(),
        equity_percentage: equityPercent || 0,
        entry_valuation: entryValuation || investmentAmount,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding portfolio holding:', error);
      return NextResponse.json(
        { error: 'Failed to add portfolio holding' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/portfolio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
