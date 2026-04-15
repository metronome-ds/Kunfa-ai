/**
 * Server-side tenant auth helpers.
 *
 * entity_members.user_id references profiles.id (the profile PK), NOT
 * auth.users.id. So to check membership for the current auth user, we must
 * first look up their profile.
 */

import { getSupabase } from './db';

export async function getProfileIdForAuthUser(authUserId: string): Promise<string | null> {
  const db = getSupabase();
  const { data } = await db
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle();
  return data?.id || null;
}

/**
 * Check whether the given auth user is a tenant admin (owner|admin in
 * entity_members) for the tenant's entity_id.
 */
export async function isTenantAdminForEntity(authUserId: string, entityId: string): Promise<boolean> {
  const profileId = await getProfileIdForAuthUser(authUserId);
  if (!profileId) return false;

  const db = getSupabase();
  const { data } = await db
    .from('entity_members')
    .select('role')
    .eq('entity_id', entityId)
    .eq('user_id', profileId)
    .maybeSingle();

  return data?.role === 'owner' || data?.role === 'admin';
}
