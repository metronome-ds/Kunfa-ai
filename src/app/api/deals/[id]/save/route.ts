import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/deals/[id]/save
 * Add a deal's company to watchlist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up the deal to get company_id
    const { data: deal } = await supabase
      .from('deals')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!deal?.company_id) {
      return NextResponse.json({ error: 'Deal not found or has no company' }, { status: 404 });
    }

    // Check if already watchlisted
    const { data: existing } = await supabase
      .from('watchlist_items')
      .select('id')
      .eq('investor_id', user.id)
      .eq('company_id', deal.company_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already watchlisted' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('watchlist_items')
      .insert({ investor_id: user.id, company_id: deal.company_id })
      .select()
      .single();

    if (error) {
      console.error('Error saving deal:', error);
      return NextResponse.json({ error: 'Failed to save deal' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Deal saved successfully' }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/deals/[id]/save:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/deals/[id]/save
 * Remove a deal's company from watchlist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up the deal to get company_id
    const { data: deal } = await supabase
      .from('deals')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!deal?.company_id) {
      return NextResponse.json({ error: 'Deal not found or has no company' }, { status: 404 });
    }

    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('investor_id', user.id)
      .eq('company_id', deal.company_id);

    if (error) {
      console.error('Error unsaving deal:', error);
      return NextResponse.json({ error: 'Failed to unsave deal' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Deal unsaved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/deals/[id]/save:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
