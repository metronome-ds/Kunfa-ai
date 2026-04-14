import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Get profile ID from auth user ID.
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

/**
 * Get community by slug, returns null if not found or inactive.
 */
export async function getCommunityBySlug(slug: string) {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  return data
}

/**
 * Get user's membership in a community.
 */
export async function getMembership(communityId: string, profileId: string) {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('community_members')
    .select('*')
    .eq('community_id', communityId)
    .eq('user_id', profileId)
    .eq('status', 'active')
    .maybeSingle()
  return data
}

/**
 * Verify user is an active member, returns membership or null.
 */
export async function requireMembership(communityId: string, profileId: string) {
  return getMembership(communityId, profileId)
}

/**
 * Generate a URL-safe slug from a name.
 */
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const suffix = crypto.randomBytes(4).toString('hex')
  return `${base}-${suffix}`
}
