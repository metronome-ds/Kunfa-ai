import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/team
 * List team members for current user's team
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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

    // Get current user's profile to find team_id
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

    const teamId = user.id; // Default team is user's own ID

    // Fetch team members with user details
    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select(
        `
        id,
        user_id,
        role,
        status,
        joined_at,
        users!team_members_user_id_fkey(
          id,
          user_id,
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq('team_id', teamId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: teamMembers || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team
 * Invite a team member
 * Body: { email, role }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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
    const { email, role } = body;

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, role' },
        { status: 400 }
      );
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 }
      );
    }

    // Get current user's profile to find team_id
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

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, user_id')
      .eq('email', email)
      .single();

    let userId = existingUser?.user_id;

    // Create team member invitation
    const { data: teamMember, error: inviteError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId || null,
        email: email,
        role: role,
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating team member invitation:', inviteError);
      return NextResponse.json(
        { error: 'Failed to invite team member' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: teamMember, message: 'Team member invited successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
