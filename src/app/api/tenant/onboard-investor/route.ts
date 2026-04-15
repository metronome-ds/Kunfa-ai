import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant-context';
import { sendEmail } from '@/lib/email';
import { isTenantAdminForEntity } from '@/lib/tenant-auth';

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
    .select('entity_id, name, display_name')
    .eq('id', tenantHeader.id)
    .single();
  const entityId = tenant?.entity_id;
  if (!entityId) return NextResponse.json({ error: 'Tenant has no entity' }, { status: 400 });

  if (!(await isTenantAdminForEntity(user.id, entityId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const {
    full_name, email, phone, country,
    job_title, fund_name, linkedin_url, bio,
    sector_interests, stage_focus, check_size_min, check_size_max, geographic_focus,
    is_accredited, accreditation_type, verification_notes,
  } = body;

  if (!email || !full_name) return NextResponse.json({ error: 'Name and email required' }, { status: 400 });

  // Upsert profile by email
  const { data: existingProfile } = await db
    .from('profiles')
    .select('id, user_id, email')
    .eq('email', email)
    .maybeSingle();

  // entity_members.user_id references profiles.id (profile PK)
  const profileId: string | null = existingProfile?.id || null;

  if (existingProfile) {
    await db.from('profiles').update({
      full_name,
      job_title: job_title || null,
      fund_name: fund_name || null,
      linkedin_url: linkedin_url || null,
      bio: bio || null,
      sector_interests: sector_interests || null,
      stage_focus: stage_focus || null,
      check_size_min: check_size_min ? Number(check_size_min) : null,
      check_size_max: check_size_max ? Number(check_size_max) : null,
      country: country || null,
      is_accredited: !!is_accredited,
      accreditation_type: accreditation_type || null,
      role: 'investor',
    }).eq('user_id', existingProfile.user_id);
  }

  // Generate invitation code
  const invitationCode = randomCode(8);
  await db.from('tenant_invitation_codes').insert({
    tenant_id: tenantHeader.id,
    code: invitationCode,
    type: 'investor',
    max_uses: 1,
    uses_count: 0,
    is_active: true,
    created_by: user.id,
    notes: `Invitation for ${full_name} (${email})`,
  });

  // Create entity_members row (pending if no profile yet)
  if (profileId) {
    await db.from('entity_members').upsert({
      entity_id: entityId,
      user_id: profileId,
      role: 'member',
      status: 'pending',
    }, { onConflict: 'entity_id,user_id' });
  }

  // Send invitation email (AWAITED to avoid Lambda freeze)
  const tenantName = tenant?.display_name || tenant?.name || 'Your network';
  const signupLink = `https://${tenantHeader.slug}.kunfa.ai/signup?code=${invitationCode}&email=${encodeURIComponent(email)}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #111827;">You're invited to ${tenantName}</h2>
      <p>Hi ${full_name.split(' ')[0]},</p>
      <p>You've been invited to join <strong>${tenantName}</strong> on Kunfa as an investor.</p>
      <p style="margin: 24px 0;">
        <a href="${signupLink}" style="background: #007CF8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept Invitation</a>
      </p>
      <p style="color: #6B7280; font-size: 14px;">Or use invitation code: <strong>${invitationCode}</strong></p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject: `You're invited to ${tenantName}`,
    html,
  });

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
        type: 'investor_invited',
        title: 'New investor invited',
        body: `${full_name} was invited to join your network.`,
        reference_type: 'invitation',
      }))
    );
  }

  void phone; void geographic_focus; void verification_notes;
  return NextResponse.json({ success: true, invitation_code: invitationCode });
}
