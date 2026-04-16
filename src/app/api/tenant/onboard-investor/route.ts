import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getTenantFromHeaders } from '@/lib/tenant-context'
import { sendEmail } from '@/lib/email'
import { isTenantAdminForEntity, getProfileIdForAuthUser } from '@/lib/tenant-auth'

function randomCode(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
  return out
}

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

function toPositiveNumberOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function toStringArrayOrNull(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const arr = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
  return arr.length > 0 ? arr : null
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantHeader = getTenantFromHeaders(request.headers)
  if (!tenantHeader) return NextResponse.json({ error: 'No tenant context' }, { status: 400 })

  const db = getSupabase()
  const { data: tenant } = await db
    .from('tenants')
    .select('entity_id, name, display_name')
    .eq('id', tenantHeader.id)
    .single()
  const entityId = tenant?.entity_id
  if (!entityId) return NextResponse.json({ error: 'Tenant has no entity' }, { status: 400 })

  if (!(await isTenantAdminForEntity(user.id, entityId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminProfileId = await getProfileIdForAuthUser(user.id)
  if (!adminProfileId) {
    return NextResponse.json({ error: 'Admin profile not found' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    full_name,
    email,
    phone,
    country,
    job_title,
    fund_name,
    linkedin_url,
    bio,
    sector_interests,
    stage_focus,
    check_size_min,
    check_size_max,
    geographic_focus,
    is_accredited,
    accreditation_type,
    verification_notes,
  } = body as Record<string, unknown>

  // --- Validation ------------------------------------------------------------
  if (typeof full_name !== 'string' || full_name.trim().length < 2) {
    return NextResponse.json({ error: 'Full name is required (min 2 characters)' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (linkedin_url && !isHttpUrl(linkedin_url)) {
    return NextResponse.json({ error: 'LinkedIn URL must be a valid http(s) URL' }, { status: 400 })
  }

  const trimmedName = (full_name as string).trim()
  const trimmedEmail = (email as string).trim().toLowerCase()
  const tsMin = toPositiveNumberOrNull(check_size_min)
  const tsMax = toPositiveNumberOrNull(check_size_max)
  if (tsMin !== null && tsMax !== null && tsMin > tsMax) {
    return NextResponse.json({ error: 'Min check size cannot exceed max' }, { status: 400 })
  }

  // --- Lookup / upsert profile ------------------------------------------------
  // Schema-verified column mapping:
  //   check_size_min/max  → ticket_size_min/max (numeric)
  //   country             → company_country
  //   bio                 → investment_thesis
  //   is_accredited, accreditation_type — columns do NOT exist on profiles;
  //     we persist them in the invitation_code.notes for admin visibility.
  const { data: existingProfile } = await db
    .from('profiles')
    .select('id, user_id, email')
    .eq('email', trimmedEmail)
    .maybeSingle()

  const sectorArr = toStringArrayOrNull(sector_interests)
  const stageArr = toStringArrayOrNull(stage_focus)
  const countryStr =
    typeof country === 'string' && country.trim() ? country.trim() : null
  const linkedinStr =
    typeof linkedin_url === 'string' && linkedin_url.trim() ? linkedin_url.trim() : null
  const jobTitleStr =
    typeof job_title === 'string' && job_title.trim() ? job_title.trim() : null
  const fundNameStr =
    typeof fund_name === 'string' && fund_name.trim() ? fund_name.trim() : null
  const bioStr = typeof bio === 'string' && bio.trim() ? bio.trim() : null

  let targetProfileId: string | null = existingProfile?.id || null

  const profileUpdatePayload: Record<string, unknown> = {
    full_name: trimmedName,
    role: 'investor',
  }
  if (jobTitleStr) profileUpdatePayload.job_title = jobTitleStr
  if (fundNameStr) profileUpdatePayload.fund_name = fundNameStr
  if (linkedinStr) profileUpdatePayload.linkedin_url = linkedinStr
  if (bioStr) profileUpdatePayload.investment_thesis = bioStr
  if (sectorArr) profileUpdatePayload.sector_interests = sectorArr
  if (stageArr) profileUpdatePayload.stage_focus = stageArr
  if (tsMin !== null) profileUpdatePayload.ticket_size_min = tsMin
  if (tsMax !== null) profileUpdatePayload.ticket_size_max = tsMax
  if (countryStr) profileUpdatePayload.company_country = countryStr

  if (existingProfile) {
    const { error: updateError } = await db
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', existingProfile.id)
    if (updateError) {
      console.error('[ONBOARD-INVESTOR] Profile update failed:', updateError)
      return NextResponse.json(
        { error: 'Failed to update existing profile' },
        { status: 500 },
      )
    }
  }

  // --- Invitation code -------------------------------------------------------
  const invitationCode = randomCode(8)
  const notesParts = [
    `Invitation for ${trimmedName} (${trimmedEmail})`,
    typeof phone === 'string' && phone ? `Phone: ${phone}` : null,
    is_accredited ? `Accredited${typeof accreditation_type === 'string' && accreditation_type ? `: ${accreditation_type}` : ''}` : null,
    typeof verification_notes === 'string' && verification_notes ? `Notes: ${verification_notes}` : null,
    typeof geographic_focus === 'string' && geographic_focus ? `Geo focus: ${geographic_focus}` : null,
  ].filter(Boolean)

  const { error: codeError } = await db.from('tenant_invitation_codes').insert({
    tenant_id: tenantHeader.id,
    code: invitationCode,
    type: 'investor',
    max_uses: 1,
    uses_count: 0,
    is_active: true,
    created_by: adminProfileId, // FK to profiles(id)
    notes: notesParts.join(' — '),
  })
  if (codeError) {
    console.error('[ONBOARD-INVESTOR] Invitation code insert failed:', codeError)
    return NextResponse.json(
      { error: 'Failed to generate invitation code' },
      { status: 500 },
    )
  }

  // --- Entity membership ------------------------------------------------------
  // Only create/upsert membership when we already have a profile. Otherwise
  // the membership will be established when the invitee completes signup and
  // a profile is created for them.
  if (targetProfileId) {
    const { error: memberError } = await db
      .from('entity_members')
      .upsert(
        {
          entity_id: entityId,
          user_id: targetProfileId,
          role: 'member',
          status: 'pending',
        },
        { onConflict: 'entity_id,user_id' },
      )
    if (memberError) {
      console.error('[ONBOARD-INVESTOR] Entity member upsert failed:', memberError)
      // Non-fatal — the invitation email will still be sent and the admin
      // can re-add them via the membership flow.
    }
  }

  // --- Invitation email (AWAITED per CLAUDE.md) ------------------------------
  const tenantName = tenant?.display_name || tenant?.name || 'Your network'
  const signupLink = `https://${tenantHeader.slug}.kunfa.ai/signup?code=${invitationCode}&email=${encodeURIComponent(trimmedEmail)}`
  const firstName = trimmedName.split(' ')[0] || 'there'
  const html = `
    <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #111827;">
      <h2 style="color: #111827;">You're invited to ${tenantName}</h2>
      <p>Hi ${firstName},</p>
      <p>You've been invited to join <strong>${tenantName}</strong> on Kunfa as an investor. Your profile has been pre-filled and you'll see curated deal flow from our network once you sign in.</p>
      <p style="margin: 24px 0;">
        <a href="${signupLink}" style="background: #007CF8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept invitation</a>
      </p>
      <p style="color: #6B7280; font-size: 14px;">Or use invitation code: <strong>${invitationCode}</strong></p>
    </div>
  `

  const emailSent = await sendEmail({
    to: trimmedEmail,
    subject: `You're invited to ${tenantName}`,
    html,
  })

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
        user_id: a.user_id,
        type: 'investor_invited',
        title: 'New investor invited',
        body: `${trimmedName} was invited to join your network.`,
        reference_type: 'invitation',
      })),
    )
    if (notifyError) {
      console.error('[ONBOARD-INVESTOR] Notification insert failed:', notifyError)
    }
  }

  return NextResponse.json({
    success: true,
    invitation_code: invitationCode,
    email_sent: emailSent,
  })
}
