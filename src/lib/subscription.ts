import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Tier hierarchy — higher index = higher tier
const TIER_HIERARCHY = ['free', 'starter', 'growth', 'scale', 'pro', 'fund', 'enterprise'] as const
export type Tier = (typeof TIER_HIERARCHY)[number]

const FEATURE_MATRIX: Record<string, Tier[]> = {
  create_community: ['fund', 'enterprise'],
  ai_copilot: ['pro', 'fund', 'enterprise'],
  dms: ['pro', 'fund', 'enterprise'],
  term_sheet_analyzer: ['starter', 'growth', 'scale', 'pro', 'fund', 'enterprise'],
  unlimited_pipeline: ['pro', 'fund', 'enterprise'],
  private_docs: ['starter', 'growth', 'scale', 'pro', 'fund', 'enterprise'],
  cap_table: ['growth', 'scale', 'pro', 'fund', 'enterprise'],
  valuation_calculator: ['growth', 'scale', 'pro', 'fund', 'enterprise'],
  lp_reporting: ['fund', 'enterprise'],
  custom_invite_links: ['fund', 'enterprise'],
}

export interface UserTierResult {
  tier: Tier
  source: string
  expiresAt: string | null
  isTrialOrGrant: boolean
}

/**
 * Get the effective tier for a user.
 * Accepts the auth user ID (from supabase.auth.getUser()).
 * Looks up the profile first, then queries subscriptions.
 */
export async function getUserTier(authUserId: string): Promise<UserTierResult> {
  const supabase = getServiceClient()

  // Get profile ID from auth user ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle()

  if (!profile) {
    return { tier: 'free', source: 'none', expiresAt: null, isTrialOrGrant: false }
  }

  // Query active subscriptions for this profile
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('tier, source, expires_at')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })

  if (!subs || subs.length === 0) {
    return { tier: 'free', source: 'none', expiresAt: null, isTrialOrGrant: false }
  }

  // Find highest tier among active subscriptions
  let bestSub = subs[0]
  let bestTierIndex = TIER_HIERARCHY.indexOf(subs[0].tier as Tier)

  for (const sub of subs) {
    const idx = TIER_HIERARCHY.indexOf(sub.tier as Tier)
    if (idx > bestTierIndex) {
      bestTierIndex = idx
      bestSub = sub
    }
  }

  const tier = (TIER_HIERARCHY[bestTierIndex] || 'free') as Tier
  const isTrialOrGrant = bestSub.source === 'promo_code' || bestSub.source === 'admin_grant'

  return {
    tier,
    source: bestSub.source,
    expiresAt: bestSub.expires_at,
    isTrialOrGrant,
  }
}

/**
 * Check if a tier has access to a specific feature.
 */
export function canAccessFeature(tier: string, feature: string): boolean {
  const allowedTiers = FEATURE_MATRIX[feature]
  if (!allowedTiers) return false
  return allowedTiers.includes(tier as Tier)
}

/**
 * Get the profile ID from auth user ID.
 */
export async function getProfileId(authUserId: string): Promise<string | null> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle()
  return data?.id || null
}

export { TIER_HIERARCHY }
