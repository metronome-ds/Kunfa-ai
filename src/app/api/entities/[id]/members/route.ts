import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { getEntityMembers, inviteToEntity } from '@/lib/entity-context'

/**
 * GET /api/entities/[id]/members — list entity members
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: entityId } = await params
    const db = getSupabase()

    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Verify membership
    const { data: membership } = await db
      .from('entity_members')
      .select('role')
      .eq('entity_id', entityId)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    const members = await getEntityMembers(entityId)
    return NextResponse.json({ members, userRole: membership.role })
  } catch (error) {
    console.error('[entities/[id]/members] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/entities/[id]/members — invite member
 * Body: { email, role, name? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: entityId } = await params
    const db = getSupabase()

    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Only owner/admin can invite
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
    if (!body.email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const result = await inviteToEntity(
      entityId,
      body.email,
      body.role || 'member',
      profile.id,
      body.name,
    )

    return NextResponse.json({ member: result }, { status: 201 })
  } catch (error) {
    console.error('[entities/[id]/members] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
