import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'

/**
 * GET /api/entities/[id] — get entity details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db = getSupabase()

    // Get profile
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Check membership
    const { data: membership } = await db
      .from('entity_members')
      .select('role')
      .eq('entity_id', id)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this entity' }, { status: 403 })
    }

    const { data: entity } = await db
      .from('entities')
      .select('*')
      .eq('id', id)
      .single()

    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 })

    return NextResponse.json({ entity, memberRole: membership.role })
  } catch (error) {
    console.error('[entities/[id]] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/entities/[id] — update entity settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db = getSupabase()

    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Only owner/admin can update
    const { data: membership } = await db
      .from('entity_members')
      .select('role')
      .eq('entity_id', id)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const allowedFields = [
      'name', 'description', 'thesis', 'website_url', 'linkedin_url',
      'country', 'industry', 'stage', 'team_size', 'one_liner', 'logo_url',
      'is_raising', 'raising_amount', 'raising_instrument', 'raising_target_close',
      'open_to_coinvest', 'sector_interests', 'stage_focus', 'geo_focus',
      'aum', 'ticket_size_min', 'ticket_size_max',
    ]

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    const { data: entity, error } = await db
      .from('entities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[entities/[id]] PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update entity' }, { status: 500 })
    }

    return NextResponse.json({ entity })
  } catch (error) {
    console.error('[entities/[id]] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
