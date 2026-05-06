import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { switchEntityContext, getEntityContext } from '@/lib/entity-context'

/**
 * POST /api/entities/[id]/switch — switch active entity
 */
export async function POST(
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

    try {
      await switchEntityContext(profile.id, entityId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch entity'
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const context = await getEntityContext(profile.id)
    return NextResponse.json({ context })
  } catch (error) {
    console.error('[entities/[id]/switch] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
