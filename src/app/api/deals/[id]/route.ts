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

    // Fetch deal joined with company_pages
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(
        `
        id,
        created_by,
        assigned_to,
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
          raise_amount,
          country,
          website_url,
          founder_name,
          founder_title,
          team_size,
          founded_year,
          problem_summary,
          solution_summary,
          business_model,
          traction,
          use_of_funds,
          key_risks
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
    if (deal?.created_by) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('user_id, full_name, company_name, role, job_title')
        .eq('user_id', deal.created_by)
        .single();

      (deal as any).creator = creator;
    }

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
      .select('created_by')
      .eq('id', id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    if (deal.created_by !== user.id) {
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
      .select('created_by')
      .eq('id', id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    if (deal.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete deals you created' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting deal:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete deal' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Deal deleted successfully' },
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
