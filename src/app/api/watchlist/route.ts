import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/** Look up profiles.id from auth user id */
async function getProfileId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id as string | undefined;
}

/**
 * GET /api/watchlist
 * List investor's watchlisted companies
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

    const profileId = await getProfileId(supabase, user.id);
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('watchlist_items')
      .select(`
        id,
        created_at,
        company_pages!company_id (
          id,
          company_name,
          slug,
          overall_score,
          industry,
          stage,
          raise_amount,
          country
        )
      `)
      .eq('investor_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching watchlist:', error);
      return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/watchlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/watchlist
 * Add company to watchlist
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = await getProfileId(supabase, user.id);
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { companyId } = await request.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // KUN-21: Score gate — only allow 75+ unless the requester is an admin
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle();
    const isAdmin = requesterProfile?.is_admin === true;

    if (!isAdmin) {
      const { data: company } = await supabase
        .from('company_pages')
        .select('overall_score')
        .eq('id', companyId)
        .maybeSingle();

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      if ((company.overall_score ?? 0) < 75) {
        return NextResponse.json(
          { error: 'This company has not yet met the minimum Kunfa Score (75) for investor matching.' },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from('watchlist_items')
      .insert({ investor_id: profileId, company_id: companyId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already watchlisted' }, { status: 400 });
      }
      console.error('Error adding to watchlist:', error);
      return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/watchlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/watchlist
 * Remove company from watchlist
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = await getProfileId(supabase, user.id);
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { companyId } = await request.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('investor_id', profileId)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error removing from watchlist:', error);
      return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Removed from watchlist' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/watchlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
