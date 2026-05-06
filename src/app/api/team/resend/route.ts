import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { teamInviteEmail } from '@/lib/email-templates'
import { requirePermission } from '@/lib/permissions'

/**
 * POST /api/team/resend
 * Resend invite email to a pending team member.
 * Body: { memberId }
 *
 * Supports both entity_members (when caller has active_entity_id) and
 * legacy team_members.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { memberId } = body as { memberId?: string }

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    }

    // Resolve caller's profile + entity context
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, fund_name, company_name, active_entity_id')
      .eq('user_id', user.id)
      .single()

    if (!callerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ── Entity mode ──────────────────────────────────────────────────────
    if (callerProfile.active_entity_id) {
      const db = getSupabase()

      const { data: member } = await db
        .from('entity_members')
        .select('id, entity_id, invited_email, invited_name, role, status, invited_by')
        .eq('id', memberId)
        .eq('entity_id', callerProfile.active_entity_id)
        .maybeSingle()

      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      // Permission: caller must be owner/admin or the person who invited them
      const { data: selfMem } = await db
        .from('entity_members')
        .select('role')
        .eq('entity_id', callerProfile.active_entity_id)
        .eq('user_id', callerProfile.id)
        .eq('status', 'active')
        .maybeSingle()

      const isManager = selfMem?.role === 'owner' || selfMem?.role === 'admin'
      const isInviter = member.invited_by === callerProfile.id
      if (!isManager && !isInviter) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (member.status !== 'pending') {
        return NextResponse.json({ error: 'Member has already joined' }, { status: 400 })
      }

      if (!member.invited_email) {
        return NextResponse.json({ error: 'No email on record for this invite' }, { status: 400 })
      }

      const inviterName = callerProfile.full_name || 'A team member'
      // Use entity name from the active entity, not stale profile.fund_name
      const db2 = getSupabase()
      const { data: entityRow } = await db2.from('entities').select('name').eq('id', callerProfile.active_entity_id).single()
      const teamName = entityRow?.name || callerProfile.fund_name || callerProfile.company_name || 'their team'
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

      return NextResponse.json({ success: true, email: member.invited_email })
    }

    // ── Legacy team_members mode ─────────────────────────────────────────
    let teamCtx
    try {
      teamCtx = await requirePermission(user.id, 'manage_team')
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, fund_name, company_name')
      .eq('user_id', teamCtx.effectiveUserId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: member } = await supabase
      .from('team_members')
      .select('id, team_id, invited_email, invited_name, role, status, invited_by')
      .eq('id', memberId)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    if (member.team_id !== profile.id && member.invited_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (member.status !== 'pending') {
      return NextResponse.json({ error: 'Member has already accepted the invite' }, { status: 400 })
    }

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

    return NextResponse.json({ success: true, email: member.invited_email })
  } catch (error) {
    console.error('[team/resend] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
