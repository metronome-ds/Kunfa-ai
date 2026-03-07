import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/pipeline/[dealId]
 * Update deal stage and stage_changed_at
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { dealId } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { stage, notes } = body;

    const updateData: Record<string, unknown> = {};
    if (stage) {
      updateData.stage = stage;
      updateData.stage_changed_at = new Date().toISOString();
    }
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', dealId)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating deal:', error);
      return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in PUT /api/pipeline/[dealId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/pipeline/[dealId]
 * Remove deal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { dealId } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', dealId)
      .eq('created_by', user.id);

    if (error) {
      console.error('Error deleting deal:', error);
      return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Deal removed' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/pipeline/[dealId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
