import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';
import { isTenantAdminForEntity } from '@/lib/tenant-auth';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ isAdmin: false }, { status: 401 });

  const tenantHeader = getTenantFromHeaders(request.headers);
  if (!tenantHeader) return NextResponse.json({ isAdmin: false });

  const db = getSupabase();
  const { data: tenant } = await db
    .from('tenants')
    .select('entity_id')
    .eq('id', tenantHeader.id)
    .single();

  if (!tenant?.entity_id) return NextResponse.json({ isAdmin: false });

  const isAdmin = await isTenantAdminForEntity(user.id, tenant.entity_id);
  return NextResponse.json({ isAdmin });
}
