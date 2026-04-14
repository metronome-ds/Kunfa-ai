import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase-server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getServiceClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all active subscriptions with user info
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        tier,
        source,
        status,
        promo_code_id,
        granted_by,
        grant_reason,
        starts_at,
        expires_at,
        created_at
      `)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/subscriptions] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    // Fetch profiles for each subscription to get names/emails
    const profileIds = [...new Set((subs || []).map(s => s.user_id))]
    let profiles: Record<string, { full_name: string; email: string }> = {}

    if (profileIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', profileIds)

      if (profileData) {
        profiles = Object.fromEntries(
          profileData.map(p => [p.id, { full_name: p.full_name || '', email: p.email || '' }])
        )
      }
    }

    const enriched = (subs || []).map(s => ({
      ...s,
      user_name: profiles[s.user_id]?.full_name || 'Unknown',
      user_email: profiles[s.user_id]?.email || '',
    }))

    return NextResponse.json({ subscriptions: enriched })
  } catch (error) {
    console.error('[admin/subscriptions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
