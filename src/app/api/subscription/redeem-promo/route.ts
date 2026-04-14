import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase-server'
import { getProfileId, TIER_HIERARCHY } from '@/lib/subscription'

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
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const code = (body.code || '').trim().toUpperCase()

    if (!code) {
      return NextResponse.json({ success: false, error: 'Please enter a promo code.' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Get profile ID
    const profileId = await getProfileId(user.id)
    if (!profileId) {
      return NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 })
    }

    // Look up promo code
    const { data: promo, error: promoErr } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (promoErr || !promo) {
      return NextResponse.json({ success: false, error: 'Invalid promo code.' }, { status: 400 })
    }

    // Validate active
    if (!promo.is_active) {
      return NextResponse.json({ success: false, error: 'This promo code has been deactivated.' }, { status: 400 })
    }

    // Validate not expired
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'This promo code has expired.' }, { status: 400 })
    }

    // Validate max uses
    if (promo.max_uses !== null && promo.times_used >= promo.max_uses) {
      return NextResponse.json({ success: false, error: 'This promo code has been fully used.' }, { status: 400 })
    }

    // Validate tier
    if (!TIER_HIERARCHY.includes(promo.tier)) {
      return NextResponse.json({ success: false, error: 'Invalid promo code configuration.' }, { status: 400 })
    }

    // Check if already redeemed by this user
    const { data: existing } = await supabase
      .from('promo_code_redemptions')
      .select('id')
      .eq('promo_code_id', promo.id)
      .eq('user_id', profileId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: false, error: 'You have already redeemed this code.' }, { status: 400 })
    }

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + promo.duration_days)

    // Create subscription
    const { data: subscription, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        user_id: profileId,
        tier: promo.tier,
        source: 'promo_code',
        status: 'active',
        promo_code_id: promo.id,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (subErr || !subscription) {
      console.error('[redeem-promo] Subscription creation failed:', subErr)
      return NextResponse.json({ success: false, error: 'Failed to activate subscription.' }, { status: 500 })
    }

    // Increment times_used
    await supabase
      .from('promo_codes')
      .update({ times_used: promo.times_used + 1 })
      .eq('id', promo.id)

    // Create redemption record
    await supabase
      .from('promo_code_redemptions')
      .insert({
        promo_code_id: promo.id,
        user_id: profileId,
        subscription_id: subscription.id,
      })

    return NextResponse.json({
      success: true,
      tier: promo.tier,
      expiresAt: expiresAt.toISOString(),
      durationDays: promo.duration_days,
    })
  } catch (error) {
    console.error('[redeem-promo] Error:', error)
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
