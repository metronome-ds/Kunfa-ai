import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { updateEntityMemberRole, removeFromEntity } from '@/lib/entity-context'

/**
 * PATCH /api/entities/[id]/members/[userId] — update member role
 * Body: { role: 'owner' | 'admin' | 'member' | 'observer' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: entityId, userId: targetUserId } = await params
    const db = getSupabase()

    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Only owner/admin can change roles
    const { data: membership } = await db
      .from('entity_members')
      .select('role')
      .eq('entity_id', entityId)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.role) {
      return NextResponse.json({ error: 'role is required' }, { status: 400 })
    }

    try {
      await updateEntityMemberRole(entityId, targetUserId, body.role)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[entities/[id]/members/[userId]] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/entities/[id]/members/[userId] — remove member
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: entityId, userId: targetUserId } = await params
    const db = getSupabase()

    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Only owner/admin can remove (or user removing themselves)
    const { data: membership } = await db
      .from('entity_members')
      .select('role')
      .eq('entity_id', entityId)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()

    const isSelf = profile.id === targetUserId
    if (!isSelf && (!membership || !['owner', 'admin'].includes(membership.role))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    try {
      await removeFromEntity(entityId, targetUserId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[entities/[id]/members/[userId]] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
