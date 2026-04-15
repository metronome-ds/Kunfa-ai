import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';

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

  const { data: member } = await db
    .from('entity_members')
    .select('role')
    .eq('entity_id', tenant.entity_id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isAdmin = member?.role === 'owner' || member?.role === 'admin';
  return NextResponse.json({ isAdmin });
}
