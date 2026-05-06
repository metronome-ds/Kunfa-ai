import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getTenantFromHeaders } from '@/lib/tenant-context'
import { isTenantAdminForEntity, getProfileIdForAuthUser } from '@/lib/tenant-auth'
import { sendEmail } from '@/lib/email'
import { companyInviteEmail } from '@/lib/email-templates'

function randomCode(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
  return out
}

function isValidEmail(e: unknown): e is string {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

/**
 * POST /api/tenant/claim-invite
 *
 * Sends a claim invitation to a founder for a company in the tenant's entity.
 * Also supports resend (regenerates token) and cancel.
 *
 * Body:
 *   { companyPageId, founderEmail, personalMessage? }       — send / resend
 *   { companyPageId, action: 'cancel' }                     — cancel invite
 */
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
    .select('entity_id, features, name, display_name, slug')
    .eq('id', tenantHeader.id)
    .single()

  const entityId = tenant?.entity_id
  if (!entityId) return NextResponse.json({ error: 'Tenant has no entity' }, { status: 400 })

  if (!(await isTenantAdminForEntity(user.id, entityId))) {
    return NextResponse.json({ error: 'Only entity admins can send claim invitations' }, { status: 403 })
  }

  const profileId = await getProfileIdForAuthUser(user.id)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { companyPageId, founderEmail, personalMessage, action } = body as Record<string, unknown>

  if (typeof companyPageId !== 'string' || !companyPageId) {
    return NextResponse.json({ error: 'companyPageId is required' }, { status: 400 })
  }

  // Load company and verify entity ownership
  const { data: company } = await db
    .from('company_pages')
    .select('id, company_name, slug, entity_id, claim_status, claim_token, claim_invited_email')
    .eq('id', companyPageId)
    .single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  if (company.entity_id !== entityId) {
    return NextResponse.json({ error: 'Company does not belong to this tenant' }, { status: 403 })
  }

  // Get admin profile for inviter name
  const { data: adminProfile } = await db
    .from('profiles')
    .select('full_name, email')
    .eq('id', profileId)
    .single()

  const inviterName = adminProfile?.full_name || 'Your network admin'

  // ── Cancel action ──────────────────────────────────────────────────────
  if (action === 'cancel') {
    const { error: cancelError } = await db
      .from('company_pages')
      .update({
        claim_status: 'unclaimed',
        claim_token: null,
        claim_invited_email: null,
      })
      .eq('id', company.id)

    if (cancelError) {
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 })
    }

    // Audit log (non-fatal)
    const { error: auditCancelErr } = await db.from('tenant_audit_log').insert({
      tenant_id: tenantHeader.id,
      user_id: profileId,
      action: 'claim_invite_cancelled',
      resource_type: 'company_page',
      resource_id: company.id,
      details: { company_name: company.company_name },
    })
    if (auditCancelErr) console.error('[CLAIM-INVITE] Cancel audit log failed:', auditCancelErr)

    return NextResponse.json({ success: true, cancelled: true })
  }

  // ── Send / Resend invite ───────────────────────────────────────────────
  if (!isValidEmail(founderEmail)) {
    return NextResponse.json({ error: 'A valid founder email is required' }, { status: 400 })
  }

  if (company.claim_status === 'claimed') {
    return NextResponse.json({ error: 'Company has already been claimed' }, { status: 400 })
  }

  // Generate new claim token (even on resend — invalidates old link)
  const claimToken = crypto.randomBytes(12).toString('hex')

  const { error: updateError } = await db
    .from('company_pages')
    .update({
      claim_status: 'invite_sent',
      claim_token: claimToken,
      claim_invited_email: (founderEmail as string).toLowerCase(),
    })
    .eq('id', company.id)

  if (updateError) {
    console.error('[CLAIM-INVITE] Update failed:', updateError)
    return NextResponse.json({ error: 'Failed to update company with claim token' }, { status: 500 })
  }

  // Generate invitation code if feature enabled (D7)
  const features = (tenant?.features || {}) as Record<string, boolean>
  let invitationCode: string | null = null
  if (features.invitation_codes !== false) {
    invitationCode = randomCode(8)
    const { error: codeErr } = await db
      .from('tenant_invitation_codes')
      .insert({
        tenant_id: tenantHeader.id,
        code: invitationCode,
        type: 'startup',
        max_uses: 1,
        uses_count: 0,
        is_active: true,
        created_by: profileId,
        notes: `Claim invite for ${company.company_name} — ${founderEmail}`,
      })
    if (codeErr) {
      console.error('[CLAIM-INVITE] Invitation code insert failed:', codeErr)
      invitationCode = null
    }
  }

  // Send claim email (AWAITED — no fire-and-forget)
  const emailContent = companyInviteEmail({
    investorName: inviterName,
    companyName: company.company_name,
    claimToken,
    personalMessage: typeof personalMessage === 'string' && personalMessage.trim()
      ? personalMessage.trim()
      : undefined,
  })

  // Append invitation code to the email body if generated
  let emailHtml = emailContent.html
  if (invitationCode) {
    emailHtml = emailHtml.replace(
      '</div>',
      `<p style="margin:16px 0 0;padding:12px;background:#f0f7ff;border-radius:8px;font-size:13px;color:#374151;">Your invitation code: <strong style="letter-spacing:2px;font-family:monospace;">${invitationCode}</strong></p></div>`,
    )
  }

  const emailSent = await sendEmail({
    to: founderEmail as string,
    subject: emailContent.subject,
    html: emailHtml,
  })

  // Tenant notification for all admins
  const { data: admins } = await db
    .from('entity_members')
    .select('user_id')
    .eq('entity_id', entityId)
    .in('role', ['owner', 'admin'])
    .eq('status', 'active')

  if (admins && admins.length > 0) {
    const { error: notifErr } = await db.from('tenant_notifications').insert(
      admins.map((a: { user_id: string }) => ({
        tenant_id: tenantHeader.id,
        user_id: a.user_id,
        type: 'claim_invite_sent',
        title: 'Claim invitation sent',
        body: `Invitation sent to ${founderEmail} for ${company.company_name}`,
        link: `/company/${company.slug}`,
        reference_type: 'company_page',
        reference_id: company.id,
      })),
    )
    if (notifErr) console.error('[CLAIM-INVITE] Notification insert failed:', notifErr)
  }

  // Audit log
  const { error: auditErr } = await db.from('tenant_audit_log').insert({
    tenant_id: tenantHeader.id,
    user_id: profileId,
    action: 'claim_invite_sent',
    resource_type: 'company_page',
    resource_id: company.id,
    details: {
      company_name: company.company_name,
      founder_email: founderEmail,
      invitation_code: invitationCode,
    },
  })
  if (auditErr) console.error('[CLAIM-INVITE] Audit log insert failed:', auditErr)

  return NextResponse.json({
    success: true,
    emailSent,
    invitationCode,
  })
}
