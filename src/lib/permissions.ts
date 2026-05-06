import { getTeamContext, type TeamContext } from './team-context'
import { getSupabase } from './db'

export type Permission = 'view' | 'edit' | 'manage_team' | 'delete'

/**
 * Check if a member role has a given permission.
 *
 * Permission matrix:
 *   owner  → view, edit, manage_team, delete
 *   admin  → view, edit, manage_team
 *   member → view
 */
export function hasPermission(memberRole: string, permission: Permission): boolean {
  switch (permission) {
    case 'view':
      return true
    case 'edit':
      return memberRole === 'owner' || memberRole === 'admin'
    case 'manage_team':
      return memberRole === 'owner' || memberRole === 'admin'
    case 'delete':
      return memberRole === 'owner'
    default:
      return false
  }
}

/**
 * For API routes: get team context and check permission in one call.
 * Throws 'FORBIDDEN' if the user doesn't have the required permission.
 */
export async function requirePermission(
  userId: string,
  permission: Permission,
): Promise<TeamContext> {
  const db = getSupabase()
  const context = await getTeamContext(userId, db)
  if (!hasPermission(context.memberRole, permission)) {
    throw new Error('FORBIDDEN')
  }
  return context
}
