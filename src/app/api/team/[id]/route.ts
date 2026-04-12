import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';

/**
 * PATCH /api/team/[id]
 * Update team member role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    // Permission check: only owner/admin can manage team
    let teamCtx;
    try {
      teamCtx = await requirePermission(user.id, 'manage_team');
    } catch {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 },
      );
    }

    // Get team owner's profile (uses effective user for team members)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', teamCtx.effectiveUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('team_members')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (!member || member.team_id !== profile.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 403 });
    }

    const { data: updated, error } = await supabase
      .from('team_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team member:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/team/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/team/[id]
 * Remove a team member
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    // Permission check: only owner/admin can manage team
    let teamCtx;
    try {
      teamCtx = await requirePermission(user.id, 'manage_team');
    } catch {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 });
    }

    // Get team owner's profile (uses effective user for team members)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', teamCtx.effectiveUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('team_members')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (!member || member.team_id !== profile.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting team member:', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Member removed' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/team/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
