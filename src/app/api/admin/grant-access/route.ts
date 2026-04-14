import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase-server'
import { TIER_HIERARCHY, getProfileId } from '@/lib/subscription'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getServiceClient()
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, tier, durationDays, reason } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const validTiers = TIER_HIERARCHY.filter(t => t !== 'free')
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: `Tier must be one of: ${validTiers.join(', ')}` }, { status: 400 })
    }

    if (!durationDays || durationDays < 1) {
      return NextResponse.json({ error: 'Duration must be at least 1 day.' }, { status: 400 })
    }

    // userId here is the profile ID (from the admin UI)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    const { data: subscription, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        tier,
        source: 'admin_grant',
        status: 'active',
        granted_by: adminProfile.id,
        grant_reason: reason || null,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (subErr) {
      console.error('[admin/grant-access] Error:', subErr)
      return NextResponse.json({ error: 'Failed to create subscription.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error('[admin/grant-access] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
