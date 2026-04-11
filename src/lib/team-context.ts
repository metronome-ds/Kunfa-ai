/**
 * Team Context Helper
 *
 * Determines the effective workspace/team context for a user.
 * Users can be members of multiple teams (via team_members) and switch
 * between them. The "active team" determines whose data their dashboard shows.
 *
 * - active_team_id NULL = viewing own data
 * - active_team_id set  = viewing that team's data (the team owner's user_id)
 *
 * Uses the service role client for all queries — team context needs to read
 * across profiles and team_members regardless of RLS.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from './db'

export interface TeamContext {
  effectiveUserId: string       // The user_id to use in dashboard queries
  effectiveRole: string         // 'startup' or 'investor' — drives dashboard/sidebar
  isTeamMember: boolean         // true if viewing someone else's data
  teamOwnerName: string | null  // Name of the team owner
  companyName: string | null    // Company name (for startups)
  fundName: string | null       // Fund name (for investors)
  memberRole: string            // 'owner' | 'admin' | 'member' | 'viewer'
  activeTeamId: string | null   // The profile.id of the active team (null = own data)
}

export interface TeamOption {
  teamId: string                // profile.id of the team owner
  ownerName: string
  companyName: string | null
  fundName: string | null
  role: string                  // 'startup' or 'investor'
  memberRole: string            // 'owner' | 'admin' | 'member' | 'viewer'
}

type DbClient = SupabaseClient

/**
 * Build a TeamContext for the user viewing their OWN data.
 */
async function buildOwnContext(
  userId: string,
  ownProfile: { id: string; role: string | null; full_name: string | null; fund_name: string | null; company_name: string | null },
  db: DbClient,
): Promise<TeamContext> {
  let companyName = ownProfile.company_name || null
  if (ownProfile.role === 'startup' || ownProfile.role === 'founder') {
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
    effectiveRole: ownProfile.role || 'startup',
    isTeamMember: false,
    teamOwnerName: ownProfile.full_name || null,
    companyName,
    fundName: ownProfile.fund_name || null,
    memberRole: 'owner',
    activeTeamId: null,
  }
}

/**
 * Build a TeamContext for the user viewing a TEAM (someone else's data).
 */
async function buildContextForTeam(
  userId: string,
  teamId: string,
  db: DbClient,
): Promise<TeamContext | null> {
  const { data: ownerProfile } = await db
    .from('profiles')
    .select('id, user_id, role, full_name, fund_name, company_name')
    .eq('id', teamId)
    .single()

  if (!ownerProfile) return null

  const isOwner = ownerProfile.user_id === userId

  let memberRole = 'owner'
  if (!isOwner) {
    const { data: membership } = await db
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('member_user_id', userId)
      .eq('status', 'accepted')
      .maybeSingle()
    memberRole = membership?.role || 'member'
  }

  let companyName = ownerProfile.company_name || null
  if (ownerProfile.role === 'startup' || ownerProfile.role === 'founder') {
    const { data: company } = await db
      .from('company_pages')
      .select('company_name')
      .eq('user_id', ownerProfile.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (company?.company_name) companyName = company.company_name
  }

  return {
    effectiveUserId: ownerProfile.user_id,
    effectiveRole: ownerProfile.role || 'investor',
    isTeamMember: !isOwner,
    teamOwnerName: ownerProfile.full_name || null,
    companyName,
    fundName: ownerProfile.fund_name || null,
    memberRole,
    activeTeamId: teamId,
  }
}

/**
 * Returns the effective team context for a user.
 *
 * Resolution order:
 *  1. If active_team_id is set → use it (the team they explicitly selected)
 *  2. If active_team_id is NULL and user owns content (company_pages entry) → own context
 *  3. If active_team_id is NULL and user has accepted team memberships → auto-bootstrap
 *     to their first accepted team and persist that selection
 *  4. Otherwise → own context (empty dashboard)
 */
export async function getTeamContext(
  userId: string,
  client?: DbClient,
): Promise<TeamContext> {
  const db = client || getSupabase()

  const { data: profile } = await db
    .from('profiles')
    .select('id, user_id, role, full_name, fund_name, company_name, active_team_id')
    .eq('user_id', userId)
    .single()

  if (!profile) {
    // No profile yet — return a minimal own context
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

  // 1. Explicit team selection
  if (profile.active_team_id) {
    const ctx = await buildContextForTeam(userId, profile.active_team_id, db)
    if (ctx) return ctx
    // Active team not found → fall back to own context
  }

  // 2. Check if user owns a company (preserves zero-change for company owners)
  const { data: ownCompany } = await db
    .from('company_pages')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (ownCompany) {
    return buildOwnContext(userId, profile, db)
  }

  // 3. Auto-bootstrap to first accepted team membership
  const { data: memberships } = await db
    .from('team_members')
    .select('team_id, created_at')
    .eq('member_user_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: true })
    .limit(1)

  if (memberships && memberships.length > 0) {
    const firstTeamId = memberships[0].team_id
    // Persist the auto-selection so subsequent calls are stable
    await db
      .from('profiles')
      .update({ active_team_id: firstTeamId })
      .eq('user_id', userId)

    const ctx = await buildContextForTeam(userId, firstTeamId, db)
    if (ctx) return ctx
  }

  // 4. No teams, no company → own (empty) context
  return buildOwnContext(userId, profile, db)
}

/**
 * Returns all teams the user can switch to:
 *  - Their own profile (memberRole = 'owner')
 *  - All accepted team memberships
 */
export async function getAvailableTeams(
  userId: string,
  client?: DbClient,
): Promise<TeamOption[]> {
  const db = client || getSupabase()
  const teams: TeamOption[] = []

  // Own profile (always included)
  const { data: ownProfile } = await db
    .from('profiles')
    .select('id, role, full_name, fund_name, company_name')
    .eq('user_id', userId)
    .single()

  if (ownProfile) {
    let companyName = ownProfile.company_name || null
    if (ownProfile.role === 'startup' || ownProfile.role === 'founder') {
      const { data: company } = await db
        .from('company_pages')
        .select('company_name')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (company?.company_name) companyName = company.company_name
    }

    teams.push({
      teamId: ownProfile.id,
      ownerName: ownProfile.full_name || 'You',
      companyName,
      fundName: ownProfile.fund_name || null,
      role: ownProfile.role || 'startup',
      memberRole: 'owner',
    })
  }

  // Accepted team memberships
  const { data: memberships } = await db
    .from('team_members')
    .select('team_id, role')
    .eq('member_user_id', userId)
    .eq('status', 'accepted')

  if (memberships && memberships.length > 0) {
    const teamIds = memberships.map((m) => m.team_id)
    const { data: ownerProfiles } = await db
      .from('profiles')
      .select('id, user_id, role, full_name, fund_name, company_name')
      .in('id', teamIds)

    if (ownerProfiles) {
      for (const owner of ownerProfiles) {
        // Skip if this is the user's own profile (already added above)
        if (ownProfile && owner.id === ownProfile.id) continue

        const membership = memberships.find((m) => m.team_id === owner.id)
        let companyName = owner.company_name || null
        if (owner.role === 'startup' || owner.role === 'founder') {
          const { data: company } = await db
            .from('company_pages')
            .select('company_name')
            .eq('user_id', owner.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (company?.company_name) companyName = company.company_name
        }

        teams.push({
          teamId: owner.id,
          ownerName: owner.full_name || '',
          companyName,
          fundName: owner.fund_name || null,
          role: owner.role || 'investor',
          memberRole: membership?.role || 'member',
        })
      }
    }
  }

  return teams
}

/**
 * Switch the user's active team context.
 *  - teamId = null → switch to own data
 *  - teamId set   → switch to that team (validates membership first)
 *
 * Throws if the user is not a member of the requested team.
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
      .update({ active_team_id: null })
      .eq('user_id', userId)
    return
  }

  // Allow switching to own profile
  const { data: ownProfile } = await db
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (ownProfile?.id !== teamId) {
    // Must be an accepted member
    const { data: membership } = await db
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('member_user_id', userId)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!membership) {
      throw new Error('Not a member of this team')
    }
  }

  await db
    .from('profiles')
    .update({ active_team_id: teamId })
    .eq('user_id', userId)
}
