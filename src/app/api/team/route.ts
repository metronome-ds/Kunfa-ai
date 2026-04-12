import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { teamInviteEmail } from '@/lib/email-templates';
import { requirePermission } from '@/lib/permissions';

/**
 * GET /api/team
 * List team members for current user's team
 * team_id = current user's profiles.id
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

    // Get current user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // team_id = profiles.id of the owner
    const teamId = profile.id;

    // Fetch team members
    const { data: members, error } = await supabase
      .from('team_members')
      .select('id, member_user_id, invited_email, invited_name, role, status, created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    // For accepted members with member_user_id, fetch their profile name
    const acceptedUserIds = (members || [])
      .filter(m => m.member_user_id)
      .map(m => m.member_user_id);

    let profileMap: Record<string, { full_name: string; email: string }> = {};
    if (acceptedUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', acceptedUserIds);

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.user_id] = { full_name: p.full_name || '', email: p.email || '' };
        }
      }
    }

    // Format response: owner first, then members
    const formatted = (members || []).map(m => ({
      id: m.id,
      name: m.member_user_id && profileMap[m.member_user_id]?.full_name
        ? profileMap[m.member_user_id].full_name
        : m.invited_name || '',
      email: m.member_user_id && profileMap[m.member_user_id]?.email
        ? profileMap[m.member_user_id].email
        : m.invited_email,
      role: m.role,
      status: m.status,
      member_user_id: m.member_user_id,
      created_at: m.created_at,
    }));

    // Include the owner as a virtual entry at the top
    const result = [
      {
        id: 'owner',
        name: profile.full_name || 'You',
        email: profile.email || user.email || '',
        role: 'owner',
        status: 'accepted',
        member_user_id: user.id,
        created_at: null,
      },
      ...formatted,
    ];

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/team
 * Invite a team member
 * Body: { name, email, role }
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

    // Permission check: only owner/admin can manage team
    let teamCtx;
    try {
      teamCtx = await requirePermission(user.id, 'manage_team');
    } catch {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 },
      );
    }

    if (!['admin', 'member', 'viewer'].includes(role || '')) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 },
      );
    }

    // Get team owner's profile.id for team_id (uses effective user for team members)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, fund_name, company_name')
      .eq('user_id', teamCtx.effectiveUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if already invited
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', profile.id)
      .eq('invited_email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This email has already been invited to your team' },
        { status: 409 },
      );
    }

    // Check if the invited email already has a profile (auto-link)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    const { data: member, error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: profile.id,
        invited_email: email,
        invited_name: name,
        role: role || 'member',
        status: existingProfile ? 'accepted' : 'pending',
        member_user_id: existingProfile?.user_id || null,
        invited_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inviting team member:', insertError);
      return NextResponse.json({ error: 'Failed to invite team member' }, { status: 500 });
    }

    // Send invitation email (don't block on failure)
    if (member.status === 'pending') {
      const inviterName = profile.full_name || 'A team member';
      const teamName = profile.fund_name || profile.company_name || 'their team';
      console.log(`[Team Invite] Sending invite email to ${email} from ${inviterName} (${teamName})`);
      const emailContent = teamInviteEmail({
        inviterName,
        teamName,
        role: role || 'member',
        teamMemberId: member.id,
      });
      sendEmail({ to: email, ...emailContent })
        .then(sent => {
          if (sent) {
            console.log(`[Team Invite] Email sent successfully to ${email}`);
          } else {
            console.error(`[Team Invite] Email FAILED to send to ${email} — check RESEND_API_KEY`);
          }
        })
        .catch(err => {
          console.error(`[Team Invite] Email error for ${email}:`, err instanceof Error ? err.message : err);
        });
    } else {
      console.log(`[Team Invite] Skipping email for ${email} — status is ${member.status} (auto-accepted)`);
    }

    return NextResponse.json(
      { data: member, message: `Invitation sent to ${email}` },
      { status: 201 },
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
