import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { updateEntityMemberRole, removeFromEntity } from '@/lib/entity-context'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveContext(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, authUserId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, active_entity_id')
    .eq('user_id', authUserId)
    .single()
  return profile
}

// ---------------------------------------------------------------------------
// PATCH /api/team/[id] — update member role
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { role } = body

    const profile = await resolveContext(supabase, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ── Entity mode ──────────────────────────────────────────────────────
    if (profile.active_entity_id) {
      const entityRoles = ['owner', 'admin', 'member', 'observer']
      if (!role || !entityRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${entityRoles.join(', ')}` },
          { status: 400 },
        )
      }

      // Look up the target member to get their user_id (profiles.id)
      const db = getSupabase()
      const { data: targetMem } = await db
        .from('entity_members')
        .select('id, entity_id, user_id, role')
        .eq('id', id)
        .eq('entity_id', profile.active_entity_id)
        .maybeSingle()

      if (!targetMem) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      // Permission: caller must be owner/admin
      const { data: selfMem } = await db
        .from('entity_members')
        .select('role')
        .eq('entity_id', profile.active_entity_id)
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()

      if (selfMem?.role !== 'owner' && selfMem?.role !== 'admin') {
        return NextResponse.json({ error: 'Only owners and admins can change roles' }, { status: 403 })
      }

      // Prevent non-owners from setting owner role
      if (role === 'owner' && selfMem.role !== 'owner') {
        return NextResponse.json({ error: 'Only owners can grant owner role' }, { status: 403 })
      }

      try {
        await updateEntityMemberRole(profile.active_entity_id, targetMem.user_id, role)
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Failed to update role' },
          { status: 400 },
        )
      }

      return NextResponse.json({ data: { id, role } })
    }

    // ── Legacy team_members mode ─────────────────────────────────────────
    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 },
      )
    }

    let teamCtx
    try {
      teamCtx = await requirePermission(user.id, 'manage_team')
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', teamCtx.effectiveUserId)
      .single()

    if (!ownerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: member } = await supabase
      .from('team_members')
      .select('id, team_id')
      .eq('id', id)
      .single()

    if (!member || member.team_id !== ownerProfile.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 403 })
    }

    const { data: updated, error } = await supabase
      .from('team_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('PATCH /api/team/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/team/[id] — remove member
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await resolveContext(supabase, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ── Entity mode ──────────────────────────────────────────────────────
    if (profile.active_entity_id) {
      const db = getSupabase()

      const { data: targetMem } = await db
        .from('entity_members')
        .select('id, entity_id, user_id, role')
        .eq('id', id)
        .eq('entity_id', profile.active_entity_id)
        .maybeSingle()

      if (!targetMem) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      // Permission: caller must be owner/admin (or removing self)
      const { data: selfMem } = await db
        .from('entity_members')
        .select('role')
        .eq('entity_id', profile.active_entity_id)
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()

      const isSelf = targetMem.user_id === profile.id
      if (!isSelf && selfMem?.role !== 'owner' && selfMem?.role !== 'admin') {
        return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 })
      }

      try {
        await removeFromEntity(profile.active_entity_id, targetMem.user_id)
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Failed to remove member' },
          { status: 400 },
        )
      }

      return NextResponse.json({ message: 'Member removed' })
    }

    // ── Legacy team_members mode ─────────────────────────────────────────
    let teamCtx
    try {
      teamCtx = await requirePermission(user.id, 'manage_team')
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', teamCtx.effectiveUserId)
      .single()

    if (!ownerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: member } = await supabase
      .from('team_members')
      .select('id, team_id')
      .eq('id', id)
      .single()

    if (!member || member.team_id !== ownerProfile.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 403 })
    }

    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Member removed' })
  } catch (error) {
    console.error('DELETE /api/team/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
