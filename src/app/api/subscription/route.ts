import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getUserTier } from '@/lib/subscription'

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await getUserTier(user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[subscription] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
