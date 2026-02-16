import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/team/[id]
 * Update team member role
 * Body: { role }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const resolvedParams = await params;

    // Get current user
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
    const { role } = body;

    // Validate role
    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 }
      );
    }

    // Get current user's profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const teamId = user.id;

    // Get the team member
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id, team_id')
      .eq('id', resolvedParams.id)
      .single();

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Verify current user is admin of the team
    if (teamMember.team_id !== teamId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update team member role
    const { data: updated, error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team member:', error);
      return NextResponse.json(
        { error: 'Failed to update team member' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: updated, message: 'Team member updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in PUT /api/team/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/[id]
 * Remove a team member
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const resolvedParams = await params;

    // Get current user
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

    // Get current user's profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const teamId = user.id;

    // Get the team member
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id, team_id')
      .eq('id', resolvedParams.id)
      .single();

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Verify current user is admin of the team
    if (teamMember.team_id !== teamId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete team member
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', resolvedParams.id);

    if (error) {
      console.error('Error deleting team member:', error);
      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Team member removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/team/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
