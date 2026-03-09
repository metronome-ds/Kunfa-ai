import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

const DEAL_FIELDS = [
  'notes',
  'priority_flag',
  'next_action',
  'next_action_date',
  'deal_size',
  'source',
  'thesis_fit',
  'contact_name',
  'contact_email',
  'assigned_to_name',
] as const;

/**
 * PUT /api/pipeline/[dealId]
 * Update deal stage and/or management fields
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

    const updateData: Record<string, unknown> = {};

    // Handle stage change
    if (body.stage) {
      updateData.stage = body.stage;
      updateData.stage_changed_at = new Date().toISOString();
    }

    // Handle all deal management fields
    for (const field of DEAL_FIELDS) {
      if (field in body) {
        const val = body[field];
        if (field === 'deal_size') {
          updateData[field] = val != null && val !== '' ? Number(val) : null;
        } else if (field === 'priority_flag') {
          updateData[field] = !!val;
        } else {
          updateData[field] = val ?? null;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

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
