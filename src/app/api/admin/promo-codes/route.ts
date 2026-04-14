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

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.is_admin === true
}

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = getServiceClient()
    const { data: codes, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/promo-codes] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 })
    }

    return NextResponse.json({ codes: codes || [] })
  } catch (error) {
    console.error('[admin/promo-codes] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const code = (body.code || '').trim().toUpperCase().replace(/\s+/g, '')
    const tier = body.tier
    const durationDays = body.durationDays
    const maxUses = body.maxUses || null
    const expiresAt = body.expiresAt || null
    const notes = body.notes || null

    if (!code || code.length > 20) {
      return NextResponse.json({ error: 'Code is required and must be 20 characters or less.' }, { status: 400 })
    }

    const validTiers = TIER_HIERARCHY.filter(t => t !== 'free')
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: `Tier must be one of: ${validTiers.join(', ')}` }, { status: 400 })
    }

    if (!durationDays || durationDays < 1) {
      return NextResponse.json({ error: 'Duration must be at least 1 day.' }, { status: 400 })
    }

    const profileId = await getProfileId(user.id)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const supabase = getServiceClient()

    // Check uniqueness
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'A promo code with this name already exists.' }, { status: 400 })
    }

    const { data: created, error: createErr } = await supabase
      .from('promo_codes')
      .insert({
        code,
        tier,
        duration_days: durationDays,
        max_uses: maxUses,
        expires_at: expiresAt,
        notes,
        created_by: profileId,
      })
      .select()
      .single()

    if (createErr) {
      console.error('[admin/promo-codes] Create error:', createErr)
      return NextResponse.json({ error: 'Failed to create promo code.' }, { status: 500 })
    }

    return NextResponse.json({ code: created })
  } catch (error) {
    console.error('[admin/promo-codes] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
