// DEPRECATED: All logic now delegates to entity_members via active_entity_id.
// This file exists as an alias layer to preserve function signatures for callers.
// The legacy team_members table is no longer read or written by this module.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from './db'

export interface TeamContext {
  effectiveUserId: string       // The auth user_id of the caller (always their own)
  effectiveRole: string         // 'startup' or 'investor' — drives dashboard/sidebar
  isTeamMember: boolean         // true if viewing an entity they don't own
  teamOwnerName: string | null  // Name of the entity (mapped from entities.name)
  companyName: string | null    // entity.name (for startups) or null
  fundName: string | null       // entity.name (for funds) or null
  memberRole: string            // 'owner' | 'admin' | 'member' | 'observer'
  activeTeamId: string | null   // entity_id of the active entity (null = no entity context)
}

export interface TeamOption {
  teamId: string                // entity_id
  ownerName: string             // entity name
  companyName: string | null
  fundName: string | null
  role: string                  // entity.type or 'fund' / 'startup'
  memberRole: string            // entity_members.role
}

type DbClient = SupabaseClient

/**
 * Minimal own-context when user has no entity.
 */
async function buildOwnContext(
  userId: string,
  profile: { id: string; role: string | null; full_name: string | null; fund_name: string | null; company_name: string | null },
  db: DbClient,
): Promise<TeamContext> {
  let companyName = profile.company_name || null
  if (profile.role === 'startup' || profile.role === 'founder') {
    const { data: company } = await db
      .from('company_pages')
      .select('company_name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (company?.company_name) companyName = company.company_name
  }

  return {
    effectiveUserId: userId,
    effectiveRole: profile.role || 'startup',
    isTeamMember: false,
    teamOwnerName: profile.full_name || null,
    companyName,
    fundName: profile.fund_name || null,
    memberRole: 'owner',
    activeTeamId: null,
  }
}

/**
 * Build context for user viewing an ENTITY.
 */
async function buildEntityContext(
  userId: string,
  profileId: string,
  entityId: string,
  db: DbClient,
): Promise<TeamContext | null> {
  // Look up entity info
  const { data: entity } = await db
    .from('entities')
    .select('id, name, type, one_liner')
    .eq('id', entityId)
    .single()

  if (!entity) return null

  // Look up user's role in entity_members
  const { data: membership } = await db
    .from('entity_members')
    .select('role')
    .eq('entity_id', entityId)
    .eq('user_id', profileId)
    .in('status', ['active', 'pending'])
    .maybeSingle()

  if (!membership) return null

  const isOwner = membership.role === 'owner'
  const entityType = entity.type || 'fund'
  const isFund = entityType === 'fund' || entityType === 'vc' || entityType === 'investor'

  return {
    effectiveUserId: userId,
    effectiveRole: isFund ? 'investor' : 'startup',
    isTeamMember: !isOwner,
    teamOwnerName: entity.name || null,
    companyName: isFund ? null : entity.name || null,
    fundName: isFund ? entity.name || null : null,
    memberRole: membership.role,
    activeTeamId: entityId,
  }
}

/**
 * Returns the effective team context for a user.
 *
 * Resolution order:
 *  1. If active_entity_id is set → use it
 *  2. If user has active entity memberships → auto-bootstrap to first one
 *  3. Otherwise → own context (solo user)
 */
export async function getTeamContext(
  userId: string,
  client?: DbClient,
): Promise<TeamContext> {
  const db = client || getSupabase()

  const { data: profile } = await db
    .from('profiles')
    .select('id, user_id, role, full_name, fund_name, company_name, active_entity_id')
    .eq('user_id', userId)
    .single()

  if (!profile) {
    return {
      effectiveUserId: userId,
      effectiveRole: 'startup',
      isTeamMember: false,
      teamOwnerName: null,
      companyName: null,
      fundName: null,
      memberRole: 'owner',
      activeTeamId: null,
    }
  }

  // 1. Explicit entity selection via active_entity_id
  if (profile.active_entity_id) {
    const ctx = await buildEntityContext(userId, profile.id, profile.active_entity_id, db)
    if (ctx) return ctx
    // Entity not found or no membership — fall through
  }

  // 2. Auto-bootstrap: find first entity membership
  const { data: memberships } = await db
    .from('entity_members')
    .select('entity_id')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)

  if (memberships && memberships.length > 0) {
    const entityId = memberships[0].entity_id
    // Persist the auto-selection
    await db
      .from('profiles')
      .update({ active_entity_id: entityId })
      .eq('user_id', userId)

    const ctx = await buildEntityContext(userId, profile.id, entityId, db)
    if (ctx) return ctx
  }

  // 3. No entity membership → own solo context
  return buildOwnContext(userId, profile, db)
}

/**
 * Returns all entities the user can switch to.
 */
export async function getAvailableTeams(
  userId: string,
  client?: DbClient,
): Promise<TeamOption[]> {
  const db = client || getSupabase()
  const teams: TeamOption[] = []

  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!profile) return teams

  // All entity memberships (active)
  const { data: memberships } = await db
    .from('entity_members')
    .select('entity_id, role')
    .eq('user_id', profile.id)
    .eq('status', 'active')

  if (!memberships || memberships.length === 0) return teams

  const entityIds = memberships.map((m) => m.entity_id)
  const { data: entities } = await db
    .from('entities')
    .select('id, name, type, one_liner')
    .in('id', entityIds)

  if (entities) {
    for (const entity of entities) {
      const membership = memberships.find((m) => m.entity_id === entity.id)
      const entityType = entity.type || 'fund'
      const isFund = entityType === 'fund' || entityType === 'vc' || entityType === 'investor'

      teams.push({
        teamId: entity.id,
        ownerName: entity.name || 'Entity',
        companyName: isFund ? null : entity.name || null,
        fundName: isFund ? entity.name || null : null,
        role: isFund ? 'investor' : 'startup',
        memberRole: membership?.role || 'member',
      })
    }
  }

  return teams
}

/**
 * Switch the user's active entity context.
 */
export async function switchTeamContext(
  userId: string,
  teamId: string | null,
  client?: DbClient,
): Promise<void> {
  const db = client || getSupabase()

  if (teamId === null) {
    await db
      .from('profiles')
      .update({ active_entity_id: null })
      .eq('user_id', userId)
    return
  }

  // Validate membership
  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!profile) throw new Error('Profile not found')

  const { data: membership } = await db
    .from('entity_members')
    .select('id')
    .eq('entity_id', teamId)
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) {
    throw new Error('Not a member of this entity')
  }

  await db
    .from('profiles')
    .update({ active_entity_id: teamId })
    .eq('user_id', userId)
}
