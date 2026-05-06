import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';
import { getProfileIdForAuthUser } from '@/lib/tenant-auth';

export async function GET(request: NextRequest) {
  const debug = request.nextUrl.searchParams.get('debug') === '1';
  const diag: Record<string, unknown> = {};

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ isAdmin: false, ...(debug ? { reason: 'no-user' } : {}) }, { status: 401 });
  }
  diag.authUserId = user.id;

  const tenantHeader = getTenantFromHeaders(request.headers);
  diag.tenantHeader = tenantHeader;
  if (!tenantHeader) {
    return NextResponse.json({ isAdmin: false, ...(debug ? { ...diag, reason: 'no-tenant-header' } : {}) });
  }

  const db = getSupabase();
  const { data: tenant } = await db
    .from('tenants')
    .select('entity_id')
    .eq('id', tenantHeader.id)
    .single();
  diag.entityId = tenant?.entity_id;

  if (!tenant?.entity_id) {
    return NextResponse.json({ isAdmin: false, ...(debug ? { ...diag, reason: 'no-entity-id' } : {}) });
  }

  const profileId = await getProfileIdForAuthUser(user.id);
  diag.profileId = profileId;
  if (!profileId) {
    return NextResponse.json({ isAdmin: false, ...(debug ? { ...diag, reason: 'no-profile' } : {}) });
  }

  const { data: member } = await db
    .from('entity_members')
    .select('role, status')
    .eq('entity_id', tenant.entity_id)
    .eq('user_id', profileId)
    .maybeSingle();
  diag.member = member;

  const isAdmin = member?.role === 'owner' || member?.role === 'admin';
  return NextResponse.json({ isAdmin, ...(debug ? diag : {}) });
}
