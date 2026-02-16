import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/deals/saved
 * Get user's saved deals
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

    const { data: savedDeals, error } = await supabase
      .from('saved_deals')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching saved deals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch saved deals' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: savedDeals || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/deals/saved:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
