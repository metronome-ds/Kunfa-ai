import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getTenantFromHeaders } from '@/lib/tenant-context'
import { isTenantAdminForEntity, getProfileIdForAuthUser } from '@/lib/tenant-auth'
import { sendEmail } from '@/lib/email'

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'startup'
  )
}

function randomCode(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return out
}

function isHttpUrl(u: unknown): u is string {
  if (typeof u !== 'string' || !u) return false
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantHeader = getTenantFromHeaders(request.headers)
  if (!tenantHeader) {
    return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
  }

  const db = getSupabase()
  const { data: tenant } = await db
    .from('tenants')
    .select('entity_id, features, name, display_name, slug')
    .eq('id', tenantHeader.id)
    .single()

  const entityId = tenant?.entity_id
  if (!entityId) {
    return NextResponse.json({ error: 'Tenant has no entity' }, { status: 400 })
  }

  if (!(await isTenantAdminForEntity(user.id, entityId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const profileId = await getProfileIdForAuthUser(user.id)
  if (!profileId) {
    return NextResponse.json({ error: 'Profile not found for user' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    company_name,
    one_liner,
    description,
    website_url,
    logo_url,
    industry,
    stage,
    country,
    headquarters,
    founder_name,
    founder_title,
    founder_email,
    linkedin_url,
    is_raising,
    raise_amount,
    raising_instrument,
    raising_target_close,
    pitch_deck_url,
    financials_url,
  } = body as Record<string, unknown>

  // --- Validation ------------------------------------------------------------
  if (typeof company_name !== 'string' || company_name.trim().length < 2) {
    return NextResponse.json({ error: 'Company name is required (min 2 characters)' }, { status: 400 })
  }

  const trimmed = company_name.trim()

  if (website_url && !isHttpUrl(website_url)) {
    return NextResponse.json({ error: 'Website URL must be a valid http(s) URL' }, { status: 400 })
  }
  if (logo_url && !isHttpUrl(logo_url)) {
    return NextResponse.json({ error: 'Logo URL must be a valid http(s) URL' }, { status: 400 })
  }
  if (linkedin_url && !isHttpUrl(linkedin_url)) {
    return NextResponse.json({ error: 'LinkedIn URL must be a valid http(s) URL' }, { status: 400 })
  }
  if (pitch_deck_url && !isHttpUrl(pitch_deck_url)) {
    return NextResponse.json({ error: 'Pitch deck URL must be a valid http(s) URL' }, { status: 400 })
  }
  if (financials_url && !isHttpUrl(financials_url)) {
    return NextResponse.json({ error: 'Financials URL must be a valid http(s) URL' }, { status: 400 })
  }
  if (founder_email && typeof founder_email === 'string') {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(founder_email)
    if (!emailOk) {
      return NextResponse.json({ error: 'Founder email is not a valid email' }, { status: 400 })
    }
  }

  let raiseAmountNumeric: number | null = null
  if (raise_amount !== undefined && raise_amount !== null && raise_amount !== '') {
    const n = Number(raise_amount)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: 'Raise amount must be a positive number' }, { status: 400 })
    }
    raiseAmountNumeric = n
  }

  // --- Unique slug -----------------------------------------------------------
  const baseSlug = slugify(trimmed)
  let slug = baseSlug
  let suffix = 1
  while (true) {
    const { data: existing } = await db
      .from('company_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    slug = `${baseSlug}-${suffix++}`
    if (suffix > 50) {
      slug = `${baseSlug}-${Date.now().toString(36)}`
      break
    }
  }

  // --- Insert company_pages row ----------------------------------------------
  // Schema notes (verified against remote):
  //   - `added_by` is a plain uuid column (no FK). Convention: profile.id
  //     per the user's explicit spec for tenant-scoped inserts.
  //   - `user_id` is a FK to auth.users(id). Left null here because the
  //     onboarding admin is not the company owner — founders claim later.
  //   - `founder_email` does NOT exist; we collect it and thread through to
  //     the invitation email flow instead.
  //   - `created_by` does NOT exist on company_pages.
  const insertPayload: Record<string, unknown> = {
    entity_id: entityId,
    company_name: trimmed,
    slug,
    one_liner: typeof one_liner === 'string' ? one_liner.trim() || null : null,
    description: typeof description === 'string' ? description.trim() || null : null,
    website_url: typeof website_url === 'string' ? website_url.trim() || null : null,
    logo_url: typeof logo_url === 'string' ? logo_url.trim() || null : null,
    industry: typeof industry === 'string' ? industry.trim() || null : null,
    stage: typeof stage === 'string' ? stage.trim() || null : null,
    country: typeof country === 'string' ? country.trim() || null : null,
    headquarters: typeof headquarters === 'string' ? headquarters.trim() || null : null,
    founder_name: typeof founder_name === 'string' ? founder_name.trim() || null : null,
    founder_title: typeof founder_title === 'string' ? founder_title.trim() || null : null,
    linkedin_url: typeof linkedin_url === 'string' ? linkedin_url.trim() || null : null,
    is_raising: Boolean(is_raising),
    raise_amount: raiseAmountNumeric,
    raising_instrument:
      typeof raising_instrument === 'string' ? raising_instrument.trim() || null : null,
    raising_target_close:
      typeof raising_target_close === 'string' && raising_target_close ? raising_target_close : null,
    pdf_url: typeof pitch_deck_url === 'string' ? pitch_deck_url.trim() || null : null,
    financials_url: typeof financials_url === 'string' ? financials_url.trim() || null : null,
    is_public: true,
    source: 'tenant_onboarded',
    added_by: profileId,
    claim_status: 'unclaimed',
  }

  const { data: created, error: insertError } = await db
    .from('company_pages')
    .insert(insertPayload)
    .select('id, slug, company_name')
    .single()

  if (insertError) {
    console.error('[ONBOARD-STARTUP] Insert error:', insertError)
    return NextResponse.json(
      { error: 'Failed to create company. Please try again or contact support.' },
      { status: 500 },
    )
  }

  // --- Invitation code (if feature enabled) ----------------------------------
  const features = (tenant?.features || {}) as Record<string, boolean>
  let invitationCode: string | null = null
  if (features.invitation_codes !== false) {
    invitationCode = randomCode(8)
    const { error: codeError } = await db.from('tenant_invitation_codes').insert({
      tenant_id: tenantHeader.id,
      code: invitationCode,
      type: 'startup',
      max_uses: 1,
      uses_count: 0,
      is_active: true,
      created_by: profileId, // FK to profiles(id)
      notes: [
        `Auto-generated for onboarded startup: ${trimmed}`,
        typeof founder_email === 'string' && founder_email ? `Founder email: ${founder_email}` : null,
      ]
        .filter(Boolean)
        .join(' — '),
    })
    if (codeError) {
      // Non-fatal: log and continue. The company was created successfully.
      console.error('[ONBOARD-STARTUP] Invitation code insert failed:', codeError)
      invitationCode = null
    }
  }

  // --- Notify tenant admins --------------------------------------------------
  const { data: admins } = await db
    .from('entity_members')
    .select('user_id')
    .eq('entity_id', entityId)
    .in('role', ['owner', 'admin'])
    .eq('status', 'active')

  if (admins && admins.length > 0) {
    const { error: notifyError } = await db.from('tenant_notifications').insert(
      admins.map((a: { user_id: string }) => ({
        tenant_id: tenantHeader.id,
        user_id: a.user_id, // entity_members.user_id already = profiles.id
        type: 'startup_onboarded',
        title: 'New startup onboarded',
        body: `${trimmed} has been added to your network.`,
        link: `/company/${slug}`,
        reference_type: 'company_page',
        reference_id: created.id,
      })),
    )
    if (notifyError) {
      console.error('[ONBOARD-STARTUP] Notification insert failed:', notifyError)
    }
  }

  // --- If founder email provided + invitation code generated, email them ----
  if (
    invitationCode &&
    typeof founder_email === 'string' &&
    founder_email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(founder_email)
  ) {
    const tenantName = tenant?.display_name || tenant?.name || 'Your network'
    const founderFirstName =
      typeof founder_name === 'string' && founder_name ? founder_name.split(' ')[0] : 'there'
    const signupLink = `https://${tenantHeader.slug}.kunfa.ai/signup?code=${invitationCode}&email=${encodeURIComponent(
      founder_email,
    )}`
    const html = `
      <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #111827;">
        <h2 style="color: #111827;">${tenantName} has added ${trimmed} to their network</h2>
        <p>Hi ${founderFirstName},</p>
        <p>You've been invited to claim <strong>${trimmed}</strong> on ${tenantName}. Your company profile is live and investors in the network can see it.</p>
        <p style="margin: 24px 0;">
          <a href="${signupLink}" style="background: #007CF8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Claim your company</a>
        </p>
        <p style="color: #6B7280; font-size: 14px;">Or use invitation code: <strong>${invitationCode}</strong></p>
      </div>
    `
    // Awaited (per CLAUDE.md guidance: don't fire-and-forget — Lambda may freeze)
    await sendEmail({
      to: founder_email,
      subject: `You've been added to ${tenantName} on Kunfa`,
      html,
    })
  }

  return NextResponse.json({
    company: created,
    invitation_code: invitationCode,
  })
}
