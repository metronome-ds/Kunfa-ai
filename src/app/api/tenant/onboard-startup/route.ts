import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'startup';
}

function randomCode(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantHeader = getTenantFromHeaders(request.headers);
  if (!tenantHeader) return NextResponse.json({ error: 'No tenant context' }, { status: 400 });

  const db = getSupabase();
  const { data: tenant } = await db
    .from('tenants')
    .select('entity_id, features')
    .eq('id', tenantHeader.id)
    .single();

  const entityId = tenant?.entity_id;
  if (!entityId) return NextResponse.json({ error: 'Tenant has no entity' }, { status: 400 });

  // Check tenant admin
  const { data: member } = await db
    .from('entity_members')
    .select('role')
    .eq('entity_id', entityId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (member?.role !== 'owner' && member?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const {
    company_name, one_liner, description, website_url, logo_url,
    industry, stage, country, headquarters,
    founder_name, founder_title, founder_email, linkedin_url,
    is_raising, raise_amount, raising_instrument, raising_target_close,
    pitch_deck_url, financials_url,
  } = body;

  if (!company_name) return NextResponse.json({ error: 'Company name required' }, { status: 400 });

  const baseSlug = slugify(company_name);
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const { data: existing } = await db.from('company_pages').select('id').eq('slug', slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${suffix++}`;
    if (suffix > 50) { slug = `${baseSlug}-${Date.now()}`; break; }
  }

  const { data: created, error } = await db
    .from('company_pages')
    .insert({
      entity_id: entityId,
      company_name,
      slug,
      one_liner: one_liner || null,
      description: description || null,
      website_url: website_url || null,
      logo_url: logo_url || null,
      industry: industry || null,
      stage: stage || null,
      country: country || null,
      headquarters: headquarters || null,
      founder_name: founder_name || null,
      founder_title: founder_title || null,
      founder_email: founder_email || null,
      linkedin_url: linkedin_url || null,
      is_raising: !!is_raising,
      raise_amount: raise_amount ? Number(raise_amount) : null,
      raising_instrument: raising_instrument || null,
      raising_target_close: raising_target_close || null,
      pitch_deck_url: pitch_deck_url || null,
      financials_url: financials_url || null,
      is_public: true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Onboard startup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Generate invitation code if enabled
  const features = (tenant?.features || {}) as Record<string, boolean>;
  let invitationCode: string | null = null;
  if (features.invitation_codes !== false) {
    invitationCode = randomCode(8);
    await db.from('tenant_invitation_codes').insert({
      tenant_id: tenantHeader.id,
      code: invitationCode,
      type: 'startup',
      max_uses: 1,
      uses_count: 0,
      is_active: true,
      created_by: user.id,
      notes: `Auto-generated for ${company_name}`,
    });
  }

  // Notify tenant admins
  const { data: admins } = await db
    .from('entity_members')
    .select('user_id')
    .eq('entity_id', entityId)
    .in('role', ['owner', 'admin']);

  if (admins && admins.length > 0) {
    await db.from('tenant_notifications').insert(
      admins.map((a: { user_id: string }) => ({
        tenant_id: tenantHeader.id,
        user_id: a.user_id,
        type: 'startup_onboarded',
        title: 'New startup onboarded',
        body: `${company_name} has been added to your network.`,
        link: `/company/${slug}`,
        reference_type: 'company_page',
        reference_id: created.id,
      }))
    );
  }

  return NextResponse.json({ company: created, invitation_code: invitationCode });
}
