import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { teamInviteEmail } from '@/lib/email-templates'

/**
 * POST /api/team/resend
 * Resend invite email to a pending team member
 * Body: { memberId }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { memberId } = body as { memberId?: string }

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    }

    // Get caller's profile (team owner)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, fund_name, company_name')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get the team member and verify ownership
    const { data: member } = await supabase
      .from('team_members')
      .select('id, team_id, invited_email, invited_name, role, status, invited_by')
      .eq('id', memberId)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Verify: caller is team owner (team_id = profile.id) or invited_by matches
    if (member.team_id !== profile.id && member.invited_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (member.status !== 'pending') {
      return NextResponse.json({ error: 'Member has already accepted the invite' }, { status: 400 })
    }

    // Send the invite email
    const inviterName = profile.full_name || 'A team member'
    const teamName = profile.fund_name || profile.company_name || 'their team'

    const emailContent = teamInviteEmail({
      inviterName,
      teamName,
      role: member.role || 'member',
      teamMemberId: member.id,
    })

    const sent = await sendEmail({ to: member.invited_email, ...emailContent })

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email: member.invited_email,
    })
  } catch (error) {
    console.error('[team/resend] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
