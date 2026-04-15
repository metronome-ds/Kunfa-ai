import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';

interface Bucket { month: string; count: number }

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantHeader = getTenantFromHeaders(request.headers);
  if (!tenantHeader) return NextResponse.json({ error: 'No tenant context' }, { status: 400 });

  const db = getSupabase();
  const { data: tenant } = await db.from('tenants').select('entity_id').eq('id', tenantHeader.id).single();
  const entityId = tenant?.entity_id;
  if (!entityId) return NextResponse.json({ error: 'Tenant has no entity' }, { status: 400 });

  const { data: member } = await db
    .from('entity_members')
    .select('role')
    .eq('entity_id', entityId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (member?.role !== 'owner' && member?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const [membersRes, companiesRes, dealsRes, memberGrowthRes] = await Promise.all([
    db.from('entity_members').select('id', { count: 'exact', head: true }).eq('entity_id', entityId).eq('status', 'active'),
    db.from('company_pages').select('id, industry, stage, overall_score, company_name, raise_amount, slug').eq('entity_id', entityId),
    db.from('deals').select('id, stage, raise_amount').eq('entity_id', entityId),
    db.from('entity_members').select('created_at').eq('entity_id', entityId).gte('created_at', twelveMonthsAgo.toISOString()),
  ]);

  const companies = companiesRes.data || [];
  const deals = (dealsRes.data || []) as Array<{ id: string; stage: string | null; raise_amount: number | null }>;

  const totalCapital = companies.reduce((s, c) => s + (Number(c.raise_amount) || 0), 0);

  // Member growth: 12 months
  const buckets: Record<string, number> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = 0;
  }
  for (const m of (memberGrowthRes.data || []) as Array<{ created_at: string }>) {
    const d = new Date(m.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in buckets) buckets[key]++;
  }
  const memberGrowth: Bucket[] = Object.entries(buckets).map(([month, count]) => ({ month, count }));

  // Deal flow funnel by stage
  const stageCounts: Record<string, number> = {};
  for (const d of deals) {
    const s = d.stage || 'unknown';
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  }

  // Top deals by score
  const topDeals = [...companies]
    .filter((c) => c.overall_score != null)
    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    .slice(0, 5)
    .map((c) => ({ id: c.id, company_name: c.company_name, slug: c.slug, score: c.overall_score, raise_amount: c.raise_amount }));

  // Sector & stage breakdowns
  const sectorCounts: Record<string, number> = {};
  const stageBreakdown: Record<string, number> = {};
  for (const c of companies) {
    const ind = c.industry || 'Unspecified';
    sectorCounts[ind] = (sectorCounts[ind] || 0) + 1;
    const st = c.stage || 'Unspecified';
    stageBreakdown[st] = (stageBreakdown[st] || 0) + 1;
  }

  return NextResponse.json({
    overview: {
      total_members: membersRes.count || 0,
      total_startups: companies.length,
      total_deals: deals.length,
      total_capital: totalCapital,
    },
    member_growth: memberGrowth,
    deal_flow_funnel: Object.entries(stageCounts).map(([stage, count]) => ({ stage, count })),
    top_deals: topDeals,
    sector_breakdown: Object.entries(sectorCounts).map(([sector, count]) => ({ sector, count })),
    stage_breakdown: Object.entries(stageBreakdown).map(([stage, count]) => ({ stage, count })),
    engagement: { placeholder: 0 },
  });
}
