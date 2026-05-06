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
    // Check entity_members for a pending invite for this email.
    // entity_members is now the sole source of truth for team membership.
    let invite:
      | { id: string; entity_id: string; role: string }
      | null = null

    // First: look up by invite ID in entity_members
    if (inviteId) {
      const { data } = await adminDb
        .from('entity_members')
        .select('id, entity_id, role, status, invited_email')
        .eq('id', inviteId)
        .maybeSingle()
      if (data && data.status === 'pending' && data.invited_email === user.email) {
        invite = { id: data.id, entity_id: data.entity_id, role: data.role }
      }
    }

    // Fallback: search by email across all pending entity_members
    if (!invite && user.email) {
      const { data } = await adminDb
        .from('entity_members')
        .select('id, entity_id, role')
        .eq('invited_email', user.email.toLowerCase())
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle()
      if (data) invite = data
    }

    const isInvite = !!invite

    // Determine role to assign on profile.
    // - Invite signups: look up entity.type to derive role
    // - Normal signups use whatever the form passed
    let role: string | undefined = requestedRole
    if (invite) {
      const { data: entity } = await adminDb
        .from('entities')
        .select('type')
        .eq('id', invite.entity_id)
        .single()
      const entityType = entity?.type || 'fund'
      role = entityType === 'fund' || entityType === 'vc' || entityType === 'investor' ? 'investor' : 'startup'
      console.log('[COMPLETE-SIGNUP] invite detected — entity type:', entityType, '→ role:', role)
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

    // Accept entity invite: activate membership + set active_entity_id
    if (invite && user.email) {
      // Get the profile.id of the new user to use as entity_members.user_id
      const { data: newProfile } = await adminDb
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (newProfile) {
        // Update the pending entity_members row: set user_id to the new user's
        // profile.id (it was the inviter's profile.id as placeholder) and activate.
        const { error: acceptErr } = await adminDb
          .from('entity_members')
          .update({
            user_id: newProfile.id,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', invite.id)

        if (acceptErr) {
          console.error('[COMPLETE-SIGNUP] entity invite accept failed:', acceptErr.message)
        }

        // Set active_entity_id so they land in entity context
        const { error: entityErr } = await adminDb
          .from('profiles')
          .update({ active_entity_id: invite.entity_id })
          .eq('user_id', user.id)

        if (entityErr) {
          console.error('[COMPLETE-SIGNUP] active_entity_id set failed:', entityErr.message)
        }

        console.log('[COMPLETE-SIGNUP] entity invite accepted, active_entity_id set to:', invite.entity_id)
      }
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
