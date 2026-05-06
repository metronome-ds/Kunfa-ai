import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getProfileIdForAuthUser } from '@/lib/tenant-auth'
import { sendEmail } from '@/lib/email'
import { profileShareEmail } from '@/lib/email-templates'

function isValidEmail(e: unknown): e is string {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

/**
 * POST /api/companies/[id]/share — send a share invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db = getSupabase()

    const { data: company } = await db
      .from('company_pages')
      .select('id, company_name, slug, one_liner, overall_score, user_id, entity_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    // Auth: company owner OR entity admin
    let authorized = company.user_id === user.id
    if (!authorized && company.entity_id) {
      const profileId = await getProfileIdForAuthUser(user.id)
      if (profileId) {
        const { data: mem } = await db
          .from('entity_members')
          .select('role')
          .eq('entity_id', company.entity_id)
          .eq('user_id', profileId)
          .eq('status', 'active')
          .maybeSingle()
        authorized = mem?.role === 'owner' || mem?.role === 'admin'
      }
    }
    if (!authorized) return NextResponse.json({ error: 'Only the company owner or entity admin can share' }, { status: 403 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const { recipientEmail, recipientName, message, includeDealRoom, includeScore } = body as Record<string, unknown>

    if (!isValidEmail(recipientEmail)) {
      return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 })
    }

    const token = crypto.randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

    const { data: invite, error: insertErr } = await db
      .from('share_invitations')
      .insert({
        company_id: id,
        shared_by: user.id,
        recipient_email: (recipientEmail as string).toLowerCase(),
        recipient_name: typeof recipientName === 'string' && recipientName.trim() ? recipientName.trim() : null,
        token,
        message: typeof message === 'string' && message.trim() ? message.trim() : null,
        include_dealroom: includeDealRoom !== false,
        include_score: includeScore !== false,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('[SHARE] Insert failed:', insertErr)
      return NextResponse.json({ error: 'Failed to create share invitation' }, { status: 500 })
    }

    // Get sharer's name
    const { data: sharerProfile } = await db
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single()
    const sharerName = sharerProfile?.full_name || 'Someone'

    const emailContent = profileShareEmail({
      companyName: company.company_name,
      oneLiner: company.one_liner,
      score: includeScore !== false ? company.overall_score : null,
      sharerName,
      recipientName: typeof recipientName === 'string' ? recipientName.trim() : null,
      personalMessage: typeof message === 'string' && message.trim() ? message.trim() : null,
      shareToken: token,
      slug: company.slug,
    })

    const emailSent = await sendEmail({
      to: recipientEmail as string,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    return NextResponse.json({ success: true, id: invite.id, emailSent })
  } catch (error) {
    console.error('[SHARE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/companies/[id]/share — list share invitations (owner only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db = getSupabase()

    const { data: company } = await db
      .from('company_pages')
      .select('user_id, entity_id')
      .eq('id', id)
      .single()

    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    let authorized = company.user_id === user.id
    if (!authorized && company.entity_id) {
      const profileId = await getProfileIdForAuthUser(user.id)
      if (profileId) {
        const { data: mem } = await db
          .from('entity_members')
          .select('role')
          .eq('entity_id', company.entity_id)
          .eq('user_id', profileId)
          .eq('status', 'active')
          .maybeSingle()
        authorized = mem?.role === 'owner' || mem?.role === 'admin'
      }
    }
    if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await db
      .from('share_invitations')
      .select('id, recipient_email, recipient_name, is_active, view_count, last_viewed_at, created_at, expires_at')
      .eq('company_id', id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('[SHARE LIST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/share — revoke a share invitation
 * Body: { invitationId }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db = getSupabase()

    const body = await request.json().catch(() => null)
    const invitationId = (body as Record<string, unknown>)?.invitationId
    if (typeof invitationId !== 'string') {
      return NextResponse.json({ error: 'invitationId required' }, { status: 400 })
    }

    const { error } = await db
      .from('share_invitations')
      .update({ is_active: false })
      .eq('id', invitationId)
      .eq('company_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SHARE REVOKE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
