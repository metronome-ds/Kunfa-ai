import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'

/**
 * POST /api/auth/complete-signup
 *
 * Called by the signup page (and login page for invite acceptance)
 * AFTER the user already has a session — typically right after OTP
 * verification. Handles profile creation + team invite acceptance +
 * active_team_id bootstrapping.
 *
 * Body: {
 *   role?: 'startup' | 'investor'  — ignored for invite signups
 *   inviteId?: string              — team_members.id
 *   fullName?: string              — optional, saved to profiles.full_name
 * }
 *
 * Returns: { success, role, isInvite, redirectTo }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedRole = typeof body?.role === 'string' ? body.role : undefined
    const inviteId = typeof body?.inviteId === 'string' ? body.inviteId : undefined
    const fullName = typeof body?.fullName === 'string' ? body.fullName : undefined

    const adminDb = getSupabase()

    console.log('[COMPLETE-SIGNUP] user:', user.id, user.email, '| role:', requestedRole, '| inviteId:', inviteId)

    // Detect if this is an invite signup — prefer explicit inviteId, fall back to
    // any pending invite for this email (source of truth).
    let invite:
      | { id: string; team_id: string; role: string }
      | null = null

    if (inviteId) {
      const { data } = await adminDb
        .from('team_members')
        .select('id, team_id, role, status, invited_email')
        .eq('id', inviteId)
        .maybeSingle()
      if (data && data.status !== 'accepted' && data.invited_email === user.email) {
        invite = { id: data.id, team_id: data.team_id, role: data.role }
      }
    }

    if (!invite && user.email) {
      const { data } = await adminDb
        .from('team_members')
        .select('id, team_id, role')
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle()
      if (data) invite = data
    }

    const isInvite = !!invite

    // Determine role to assign on profile.
    // - Invite signups inherit the team owner's role (source of truth)
    // - Normal signups use whatever the form passed
    let role: string | undefined = requestedRole
    if (invite) {
      const { data: ownerProfile } = await adminDb
        .from('profiles')
        .select('role')
        .eq('id', invite.team_id)
        .single()
      role = ownerProfile?.role || 'investor'
      console.log('[COMPLETE-SIGNUP] invite detected — team owner role:', role)
    }

    // Ensure a profile exists. Create one if missing.
    const { data: existingProfile } = await adminDb
      .from('profiles')
      .select('id, onboarding_completed, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingProfile) {
      const profilePayload: Record<string, unknown> = {
        user_id: user.id,
        email: user.email,
        ...(role ? { role } : {}),
        ...(fullName ? { full_name: fullName } : {}),
        // Invite signups skip onboarding — they're joining an existing team
        onboarding_completed: isInvite,
      }
      const { error: insertErr } = await adminDb.from('profiles').insert(profilePayload)
      if (insertErr) {
        console.error('[COMPLETE-SIGNUP] profile insert failed:', insertErr.message)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
      console.log('[COMPLETE-SIGNUP] profile created')
    } else if (fullName || (role && !existingProfile.role)) {
      // Backfill role/full_name if missing
      const updates: Record<string, unknown> = {}
      if (fullName) updates.full_name = fullName
      if (role && !existingProfile.role) updates.role = role
      if (Object.keys(updates).length > 0) {
        await adminDb.from('profiles').update(updates).eq('user_id', user.id)
      }
    }

    // Accept the team invite + set active_team_id
    if (invite && user.email) {
      const { error: acceptErr } = await adminDb
        .from('team_members')
        .update({
          member_user_id: user.id,
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('invited_email', user.email)
        .eq('status', 'pending')

      if (acceptErr) {
        console.error('[COMPLETE-SIGNUP] invite accept failed:', acceptErr.message)
      }

      const { error: activeTeamErr } = await adminDb
        .from('profiles')
        .update({ active_team_id: invite.team_id })
        .eq('user_id', user.id)

      if (activeTeamErr) {
        console.error('[COMPLETE-SIGNUP] active_team_id set failed:', activeTeamErr.message)
      }

      console.log('[COMPLETE-SIGNUP] invite accepted, active_team_id set to:', invite.team_id)
    }

    // Determine redirect
    let redirectTo = '/dashboard'
    if (isInvite) {
      redirectTo = '/dashboard' // team members skip onboarding
    } else if (role === 'investor' && !existingProfile?.onboarding_completed) {
      redirectTo = '/onboarding'
    }

    return NextResponse.json({
      success: true,
      role: role || null,
      isInvite,
      redirectTo,
    })
  } catch (error) {
    console.error('[COMPLETE-SIGNUP] unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
