import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/pipeline/[dealId]
 * Update pipeline entry (change stage, notes, follow_up_date)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const resolvedParams = await params;

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
    const { current_stage, notes, next_steps, follow_up_date } = body;

    const updateData: any = {};
    if (current_stage) updateData.current_stage = current_stage;
    if (notes !== undefined) updateData.notes = notes;
    if (next_steps !== undefined) updateData.next_steps = next_steps;
    if (follow_up_date !== undefined) updateData.follow_up_date = follow_up_date;

    const { data, error } = await supabase
      .from('deal_pipeline')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('deal_id', resolvedParams.dealId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pipeline entry:', error);
      return NextResponse.json(
        { error: 'Failed to update pipeline entry' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Pipeline entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in PUT /api/pipeline/[dealId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pipeline/[dealId]
 * Remove deal from pipeline
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const resolvedParams = await params;

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

    const { error } = await supabase
      .from('deal_pipeline')
      .delete()
      .eq('user_id', user.id)
      .eq('deal_id', resolvedParams.dealId);

    if (error) {
      console.error('Error removing deal from pipeline:', error);
      return NextResponse.json(
        { error: 'Failed to remove deal from pipeline' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Deal removed from pipeline' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/pipeline/[dealId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
