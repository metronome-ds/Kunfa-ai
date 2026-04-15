import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getUserTier } from '@/lib/subscription'
import { getEntityContextByAuthId, getEntityTier } from '@/lib/entity-context'

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try entity-scoped tier first (new path)
    const entityCtx = await getEntityContextByAuthId(user.id)
    if (entityCtx.effectiveEntityId) {
      const result = await getEntityTier(entityCtx.effectiveEntityId)
      return NextResponse.json(result)
    }

    // Fallback: user-scoped tier (legacy path)
    const result = await getUserTier(user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[subscription] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
