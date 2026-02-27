import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/deals/[id]
 * Get deal by ID with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    // Fetch deal with documents
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(
        `
        id,
        title,
        company_name,
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
        website,
        pitch_deck_url,
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
        creator_id,
        created_at,
        updated_at,
        deal_documents(
          id,
          document_type,
          file_name,
          file_path,
          file_size,
          mime_type,
          parse_status,
          created_at
        )
      `
      )
      .eq('id', id)
      .single();

    if (dealError) {
      console.error('Error fetching deal:', dealError);
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Fetch creator profile separately
    if (deal?.creator_id) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, company_name, role, linkedin_url')
        .eq('user_id', deal.creator_id)
        .single();

      (deal as any).creator = creator;
    }

    // Increment view count
    await supabase
      .from('deals')
      .update({ view_count: (deal?.view_count || 0) + 1 })
      .eq('id', id);

    return NextResponse.json({ data: deal }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/deals/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/deals/[id]
 * Update deal (only by creator)
 */
export async function PUT(
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    if (deal.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit deals you created' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { data: updatedDeal, error: updateError } = await supabase
      .from('deals')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating deal:', updateError);
      return NextResponse.json(
        { error: 'Failed to update deal' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: updatedDeal, message: 'Deal updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in PUT /api/deals/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/deals/[id]
 * Soft delete (set status to 'archived')
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    if (deal.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete deals you created' },
        { status: 403 }
      );
    }

    const { data: archivedDeal, error: deleteError } = await supabase
      .from('deals')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();

    if (deleteError) {
      console.error('Error deleting deal:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete deal' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: archivedDeal, message: 'Deal archived successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/deals/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
