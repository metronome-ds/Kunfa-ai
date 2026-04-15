/**
 * Entity Context — replaces team-context.ts for the multi-entity model.
 *
 * An "entity" is a fund, startup, family office, angel, or lender.
 * One user can own/belong to many entities. The active entity drives
 * what data shows on the dashboard.
 *
 * Uses the service role client for all queries (bypasses RLS).
 */

import { getSupabase } from './db'
import { type Tier, TIER_HIERARCHY } from './subscription'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Entity {
  id: string
  name: string
  slug: string
  type: string // 'startup' | 'fund' | 'family_office' | 'angel' | 'lender'
  logo_url: string | null
  description: string | null
  thesis: string | null
  website_url: string | null
  linkedin_url: string | null
  country: string | null
  industry: string | null
  stage: string | null
  team_size: number | null
  one_liner: string | null
  is_raising: boolean
  raising_amount: string | null
  raising_instrument: string | null
  raising_target_close: string | null
  open_to_coinvest: boolean
  sector_interests: string[] | null
  stage_focus: string[] | null
  geo_focus: string[] | null
  aum: number | null
  ticket_size_min: number | null
  ticket_size_max: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface EntityWithRole extends Entity {
  memberRole: string // 'owner' | 'admin' | 'member' | 'observer'
}

export interface EntityContext {
  /** The user's profile */
  user: {
    id: string          // profiles.id
    userId: string      // auth.users.id (profiles.user_id)
    email: string | null
    fullName: string | null
    role: string | null // profiles.role ('startup' | 'investor' | 'founder')
  }
  /** The currently active entity (null if none) */
  activeEntity: Entity | null
  /** All entities the user is a member of */
  availableEntities: EntityWithRole[]
  /** The entity ID to use for queries (activeEntity or first owned, or null) */
  effectiveEntityId: string | null
  /** The member role within the active entity */
  memberRole: string // 'owner' | 'admin' | 'member' | 'observer' | 'none'
}

// ---------------------------------------------------------------------------
// Core context resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the entity context for a user.
 * @param profileId — profiles.id (NOT auth.users.id)
 */
export async function getEntityContext(profileId: string): Promise<EntityContext> {
  const db = getSupabase()

  // 1. Fetch user profile
  const { data: profile } = await db
    .from('profiles')
    .select('id, user_id, email, full_name, role, active_entity_id')
    .eq('id', profileId)
    .single()

  if (!profile) {
    return {
      user: { id: profileId, userId: '', email: null, fullName: null, role: null },
      activeEntity: null,
      availableEntities: [],
      effectiveEntityId: null,
      memberRole: 'none',
    }
  }

  // 2. Get all entities the user is a member of
  const availableEntities = await getAvailableEntities(profileId)

  // 3. Resolve active entity
  let activeEntity: Entity | null = null
  let memberRole = 'none'

  if (profile.active_entity_id) {
    const match = availableEntities.find(e => e.id === profile.active_entity_id)
    if (match) {
      activeEntity = match
      memberRole = match.memberRole
    }
  }

  // 4. effectiveEntityId: active entity, or first owned entity, or null
  const effectiveEntityId = activeEntity?.id
    ?? availableEntities.find(e => e.memberRole === 'owner')?.id
    ?? availableEntities[0]?.id
    ?? null

  // If effectiveEntityId differs from active but activeEntity is null, resolve it
  if (!activeEntity && effectiveEntityId) {
    const match = availableEntities.find(e => e.id === effectiveEntityId)
    if (match) {
      activeEntity = match
      memberRole = match.memberRole
    }
  }

  return {
    user: {
      id: profile.id,
      userId: profile.user_id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
    },
    activeEntity,
    availableEntities,
    effectiveEntityId,
    memberRole,
  }
}

/**
 * Resolve entity context from auth user ID (convenience wrapper).
 * Looks up profiles.id first, then calls getEntityContext.
 */
export async function getEntityContextByAuthId(authUserId: string): Promise<EntityContext> {
  const db = getSupabase()
  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle()

  if (!profile) {
    return {
      user: { id: '', userId: authUserId, email: null, fullName: null, role: null },
      activeEntity: null,
      availableEntities: [],
      effectiveEntityId: null,
      memberRole: 'none',
    }
  }

  return getEntityContext(profile.id)
}

// ---------------------------------------------------------------------------
// Entity switching
// ---------------------------------------------------------------------------

/**
 * Switch a user's active entity.
 * Verifies membership before switching.
 */
export async function switchEntityContext(profileId: string, entityId: string): Promise<void> {
  const db = getSupabase()

  // Verify membership
  const { data: membership } = await db
    .from('entity_members')
    .select('id')
    .eq('entity_id', entityId)
    .eq('user_id', profileId)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) {
    throw new Error('Not a member of this entity')
  }

  await db
    .from('profiles')
    .update({ active_entity_id: entityId })
    .eq('id', profileId)
}

// ---------------------------------------------------------------------------
// Entity listing
// ---------------------------------------------------------------------------

/**
 * Get all entities a user owns or is a member of.
 * Ordered: owned first, then by name.
 */
export async function getAvailableEntities(profileId: string): Promise<EntityWithRole[]> {
  const db = getSupabase()

  const { data: memberships } = await db
    .from('entity_members')
    .select('entity_id, role')
    .eq('user_id', profileId)
    .eq('status', 'active')

  if (!memberships || memberships.length === 0) return []

  const entityIds = memberships.map(m => m.entity_id)
  const { data: entities } = await db
    .from('entities')
    .select('*')
    .in('id', entityIds)

  if (!entities) return []

  // Merge role info and sort
  const result: EntityWithRole[] = entities.map(e => {
    const membership = memberships.find(m => m.entity_id === e.id)
    return { ...e, memberRole: membership?.role || 'member' }
  })

  // Sort: owners first, then by name
  result.sort((a, b) => {
    if (a.memberRole === 'owner' && b.memberRole !== 'owner') return -1
    if (a.memberRole !== 'owner' && b.memberRole === 'owner') return 1
    return a.name.localeCompare(b.name)
  })

  return result
}

// ---------------------------------------------------------------------------
// Entity CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new entity and add the creator as owner.
 */
export async function createEntity(
  data: {
    name: string
    type: string
    description?: string | null
    thesis?: string | null
    website_url?: string | null
    linkedin_url?: string | null
    country?: string | null
    industry?: string | null
    stage?: string | null
    one_liner?: string | null
  },
  createdByProfileId: string,
): Promise<Entity> {
  const db = getSupabase()

  // Generate slug
  const baseSlug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const randomSuffix = Math.random().toString(36).substring(2, 10)
  const slug = `${baseSlug}-${randomSuffix}`

  const { data: entity, error } = await db
    .from('entities')
    .insert({
      name: data.name,
      slug,
      type: data.type,
      description: data.description || null,
      thesis: data.thesis || null,
      website_url: data.website_url || null,
      linkedin_url: data.linkedin_url || null,
      country: data.country || null,
      industry: data.industry || null,
      stage: data.stage || null,
      one_liner: data.one_liner || null,
      created_by: createdByProfileId,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create entity: ${error.message}`)

  // Create owner membership
  await db.from('entity_members').insert({
    entity_id: entity.id,
    user_id: createdByProfileId,
    role: 'owner',
    status: 'active',
  })

  // Set as active entity if user has no active entity
  const { data: profile } = await db
    .from('profiles')
    .select('active_entity_id')
    .eq('id', createdByProfileId)
    .single()

  if (!profile?.active_entity_id) {
    await db
      .from('profiles')
      .update({ active_entity_id: entity.id })
      .eq('id', createdByProfileId)
  }

  return entity
}

// ---------------------------------------------------------------------------
// Subscription / tier resolution (entity-scoped)
// ---------------------------------------------------------------------------

/**
 * Get the effective tier for an entity.
 * Falls back to the entity owner's profile-level subscription if no
 * entity-scoped subscription exists (for backwards compatibility).
 */
export async function getEntityTier(entityId: string): Promise<{
  tier: Tier
  source: string
  expiresAt: string | null
  isTrialOrGrant: boolean
}> {
  const db = getSupabase()

  // Try entity-scoped subscription first
  const { data: entitySubs } = await db
    .from('subscriptions')
    .select('tier, source, expires_at')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })

  if (entitySubs && entitySubs.length > 0) {
    return pickHighestTier(entitySubs)
  }

  // Fallback: look up entity owner's profile-level subscription
  const { data: entity } = await db
    .from('entities')
    .select('created_by')
    .eq('id', entityId)
    .single()

  if (entity) {
    const { data: profileSubs } = await db
      .from('subscriptions')
      .select('tier, source, expires_at')
      .eq('user_id', entity.created_by)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })

    if (profileSubs && profileSubs.length > 0) {
      return pickHighestTier(profileSubs)
    }
  }

  return { tier: 'free' as Tier, source: 'none', expiresAt: null, isTrialOrGrant: false }
}

function pickHighestTier(subs: { tier: string; source: string; expires_at: string | null }[]) {
  let bestSub = subs[0]
  let bestIdx = TIER_HIERARCHY.indexOf(subs[0].tier as Tier)

  for (const sub of subs) {
    const idx = TIER_HIERARCHY.indexOf(sub.tier as Tier)
    if (idx > bestIdx) {
      bestIdx = idx
      bestSub = sub
    }
  }

  const tier = (TIER_HIERARCHY[bestIdx] || 'free') as Tier
  return {
    tier,
    source: bestSub.source,
    expiresAt: bestSub.expires_at,
    isTrialOrGrant: bestSub.source === 'promo_code' || bestSub.source === 'admin_grant',
  }
}

/**
 * Check if an entity's tier has access to a specific feature.
 */
export async function canEntityAccessFeature(entityId: string, feature: string): Promise<boolean> {
  const { canAccessFeature } = await import('./subscription')
  const { tier } = await getEntityTier(entityId)
  return canAccessFeature(tier, feature)
}

// ---------------------------------------------------------------------------
// Entity member management
// ---------------------------------------------------------------------------

export async function getEntityMembers(entityId: string) {
  const db = getSupabase()
  const { data } = await db
    .from('entity_members')
    .select(`
      id, entity_id, user_id, role, status, invited_email, invited_name, invited_by, title, joined_at,
      profiles!user_id (id, full_name, email, avatar_url)
    `)
    .eq('entity_id', entityId)
    .order('role', { ascending: true })

  return data || []
}

export async function inviteToEntity(
  entityId: string,
  email: string,
  role: string,
  invitedByProfileId: string,
  name?: string,
): Promise<{ id: string; status: string }> {
  const db = getSupabase()

  // Check if user already exists
  const { data: existingProfile } = await db
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (existingProfile) {
    // Check for existing membership
    const { data: existing } = await db
      .from('entity_members')
      .select('id, status')
      .eq('entity_id', entityId)
      .eq('user_id', existingProfile.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'removed') {
        // Re-activate
        await db
          .from('entity_members')
          .update({ status: 'active', role })
          .eq('id', existing.id)
        return { id: existing.id, status: 'active' }
      }
      return { id: existing.id, status: existing.status }
    }

    // Create active membership (user exists)
    const { data: member, error } = await db
      .from('entity_members')
      .insert({
        entity_id: entityId,
        user_id: existingProfile.id,
        role,
        status: 'active',
        invited_email: email.toLowerCase(),
        invited_name: name || null,
        invited_by: invitedByProfileId,
      })
      .select('id, status')
      .single()

    if (error) throw new Error(`Failed to invite: ${error.message}`)
    return member
  }

  // User doesn't exist — create pending invite
  // We need a user_id for the FK. Use the inviter's profile as placeholder
  // (will be updated when they sign up, similar to community invite pattern).
  const { data: member, error } = await db
    .from('entity_members')
    .insert({
      entity_id: entityId,
      user_id: invitedByProfileId, // placeholder
      role,
      status: 'pending',
      invited_email: email.toLowerCase(),
      invited_name: name || null,
      invited_by: invitedByProfileId,
    })
    .select('id, status')
    .single()

  if (error) throw new Error(`Failed to invite: ${error.message}`)
  return member
}

export async function removeFromEntity(entityId: string, userId: string): Promise<void> {
  const db = getSupabase()

  // Don't allow removing the last owner
  const { data: owners } = await db
    .from('entity_members')
    .select('id')
    .eq('entity_id', entityId)
    .eq('role', 'owner')
    .eq('status', 'active')

  const { data: member } = await db
    .from('entity_members')
    .select('role')
    .eq('entity_id', entityId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (member?.role === 'owner' && owners && owners.length <= 1) {
    throw new Error('Cannot remove the last owner')
  }

  await db
    .from('entity_members')
    .update({ status: 'removed' })
    .eq('entity_id', entityId)
    .eq('user_id', userId)
}

export async function updateEntityMemberRole(
  entityId: string,
  userId: string,
  newRole: string,
): Promise<void> {
  const db = getSupabase()

  // If demoting from owner, ensure at least one owner remains
  if (newRole !== 'owner') {
    const { data: currentMember } = await db
      .from('entity_members')
      .select('role')
      .eq('entity_id', entityId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (currentMember?.role === 'owner') {
      const { data: owners } = await db
        .from('entity_members')
        .select('id')
        .eq('entity_id', entityId)
        .eq('role', 'owner')
        .eq('status', 'active')

      if (owners && owners.length <= 1) {
        throw new Error('Cannot demote the last owner')
      }
    }
  }

  await db
    .from('entity_members')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('entity_id', entityId)
    .eq('user_id', userId)
}
