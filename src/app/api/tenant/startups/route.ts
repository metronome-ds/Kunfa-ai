import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';
import { isTenantAdminForEntity } from '@/lib/tenant-auth';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantHeader = getTenantFromHeaders(request.headers);
  if (!tenantHeader) return NextResponse.json({ error: 'No tenant context' }, { status: 400 });

  const db = getSupabase();
  const { data: tenant } = await db
    .from('tenants')
    .select('entity_id')
    .eq('id', tenantHeader.id)
    .single();
  const entityId = tenant?.entity_id;
  if (!entityId) return NextResponse.json({ data: [] });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const industry = searchParams.get('industry') || '';
  const stage = searchParams.get('stage') || '';
  const sort = searchParams.get('sort') || 'score';

  // Admins see claim status; regular members don't (data isolation)
  const isAdmin = await isTenantAdminForEntity(user.id, entityId);

  const selectCols = isAdmin
    ? 'id, company_name, slug, logo_url, one_liner, industry, stage, founder_name, country, overall_score, is_raising, raise_amount, created_at, source, claim_status, claim_invited_email'
    : 'id, company_name, slug, logo_url, one_liner, industry, stage, founder_name, country, overall_score, is_raising, raise_amount, created_at, source';

  let query = db
    .from('company_pages')
    .select(selectCols)
    .eq('entity_id', entityId)
    .is('deleted_at', null);

  if (search) query = query.or(`company_name.ilike.%${search}%,one_liner.ilike.%${search}%`);
  if (industry) query = query.eq('industry', industry);
  if (stage) query = query.eq('stage', stage);

  if (sort === 'newest') query = query.order('created_at', { ascending: false });
  else if (sort === 'name') query = query.order('company_name', { ascending: true });
  else query = query.order('overall_score', { ascending: false, nullsFirst: false });

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}
