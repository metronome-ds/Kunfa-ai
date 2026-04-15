import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';

interface ActivityItem {
  id: string;
  type: 'startup' | 'investor' | 'deal';
  text: string;
  time: string;
  href?: string;
}

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
  if (!entityId) {
    return NextResponse.json({
      stats: { capital_deployed: 0, active_deals: 0, network_size: 0, new_this_month: 0 },
      recent_activity: [],
    });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [companiesRes, raisingRes, membersRes, newMembersRes, recentCompaniesRes, recentMembersRes] = await Promise.all([
    db.from('company_pages').select('raise_amount').eq('entity_id', entityId),
    db.from('company_pages').select('id', { count: 'exact', head: true }).eq('entity_id', entityId).eq('is_raising', true),
    db.from('entity_members').select('id', { count: 'exact', head: true }).eq('entity_id', entityId).eq('status', 'active'),
    db.from('entity_members').select('id', { count: 'exact', head: true }).eq('entity_id', entityId).gte('created_at', monthStart),
    db.from('company_pages').select('id, slug, company_name, created_at, is_raising').eq('entity_id', entityId).order('created_at', { ascending: false }).limit(10),
    db.from('entity_members').select('id, user_id, created_at, profiles:profiles(full_name, role)').eq('entity_id', entityId).order('created_at', { ascending: false }).limit(10),
  ]);

  const capital = (companiesRes.data || []).reduce((sum: number, c: { raise_amount: number | null }) => sum + (Number(c.raise_amount) || 0), 0);

  const activity: ActivityItem[] = [];
  for (const c of recentCompaniesRes.data || []) {
    activity.push({
      id: `c-${c.id}`,
      type: c.is_raising ? 'deal' : 'startup',
      text: c.is_raising ? `Deal posted: ${c.company_name}` : `New startup: ${c.company_name}`,
      time: c.created_at,
      href: c.slug ? `/company/${c.slug}` : undefined,
    });
  }
  type MemberRow = { id: string; user_id: string; created_at: string; profiles: { full_name: string | null; role: string | null } | { full_name: string | null; role: string | null }[] | null };
  for (const m of (recentMembersRes.data || []) as unknown as MemberRow[]) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    const name = p?.full_name || 'Member';
    const isInvestor = p?.role === 'investor' || p?.role === 'vc';
    activity.push({
      id: `m-${m.id}`,
      type: 'investor',
      text: isInvestor ? `New investor: ${name}` : `New member: ${name}`,
      time: m.created_at,
    });
  }
  activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return NextResponse.json({
    stats: {
      capital_deployed: capital,
      active_deals: raisingRes.count || 0,
      network_size: membersRes.count || 0,
      new_this_month: newMembersRes.count || 0,
    },
    recent_activity: activity.slice(0, 10),
  });
}
