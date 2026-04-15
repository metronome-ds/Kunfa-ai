import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';
import { isTenantAdminForEntity } from '@/lib/tenant-auth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantHeader = getTenantFromHeaders(request.headers);
  if (!tenantHeader) return NextResponse.json({ error: 'No tenant context' }, { status: 400 });

  const db = getSupabase();
  const { data: tenant } = await db.from('tenants').select('entity_id').eq('id', tenantHeader.id).single();
  const entityId = tenant?.entity_id;
  if (!entityId) return NextResponse.json({ error: 'Tenant has no entity' }, { status: 400 });

  if (!(await isTenantAdminForEntity(user.id, entityId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await db
    .from('tenant_invitation_codes')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantHeader.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
