import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';
import { isTenantAdminForEntity } from '@/lib/tenant-auth';

function randomCode(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

async function requireTenantAdmin(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const tenantHeader = getTenantFromHeaders(request.headers);
  if (!tenantHeader) return { error: NextResponse.json({ error: 'No tenant context' }, { status: 400 }) };

  const db = getSupabase();
  const { data: tenant } = await db.from('tenants').select('entity_id').eq('id', tenantHeader.id).single();
  const entityId = tenant?.entity_id;
  if (!entityId) return { error: NextResponse.json({ error: 'Tenant has no entity' }, { status: 400 }) };

  if (!(await isTenantAdminForEntity(user.id, entityId))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, tenantId: tenantHeader.id, db };
}

export async function GET(request: NextRequest) {
  const ctx = await requireTenantAdmin(request);
  if ('error' in ctx) return ctx.error;

  const { data, error } = await ctx.db
    .from('tenant_invitation_codes')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const ctx = await requireTenantAdmin(request);
  if ('error' in ctx) return ctx.error;

  const body = await request.json();
  const { type, max_uses, expires_at, notes, count, code: explicitCode } = body;

  if (type !== 'startup' && type !== 'investor') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const n = Math.min(50, Math.max(1, Number(count) || 1));
  const rows = Array.from({ length: n }).map(() => ({
    tenant_id: ctx.tenantId,
    code: explicitCode && n === 1 ? String(explicitCode).toUpperCase() : randomCode(8),
    type,
    max_uses: max_uses ? Number(max_uses) : 1,
    uses_count: 0,
    expires_at: expires_at || null,
    is_active: true,
    created_by: ctx.user.id,
    notes: notes || null,
  }));

  const { data, error } = await ctx.db.from('tenant_invitation_codes').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}
