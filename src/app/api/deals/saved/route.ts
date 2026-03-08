import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/deals/saved
 * Get user's watchlisted companies (via watchlist_items)
 * Returns company_pages data joined for display
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: watchlistItems, error } = await supabase
      .from('watchlist_items')
      .select(`
        id,
        investor_id,
        company_id,
        created_at,
        company_pages!company_id (
          id,
          company_name,
          slug,
          description,
          one_liner,
          overall_score,
          industry,
          stage,
          raise_amount,
          country
        )
      `)
      .eq('investor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching watchlist items:', error);
      return NextResponse.json({ error: 'Failed to fetch saved deals' }, { status: 500 });
    }

    return NextResponse.json({ data: watchlistItems || [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/deals/saved:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
