import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'
import { dealroomAccessNurtureEmail } from '@/lib/email-templates'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email, companyId } = body as { email?: string; companyId?: string }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!companyId || !UUID_REGEX.test(companyId)) {
      return NextResponse.json({ error: 'Valid companyId is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Look up company (for name + existence check)
    const { data: company, error: companyError } = await supabase
      .from('company_pages')
      .select('id, company_name, user_id')
      .eq('id', companyId)
      .maybeSingle()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check if the email matches an existing Kunfa user
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    const viewerUserId = profile?.user_id || null
    const isExistingUser = !!viewerUserId

    // If the current request has a logged-in user, prefer their id
    let authenticatedUserId: string | null = null
    try {
      const authClient = await createServerSupabaseClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (user) authenticatedUserId = user.id
    } catch {
      // Non-authenticated request — that's fine
    }

    const finalViewerUserId = authenticatedUserId || viewerUserId

    // Generate session id
    const sessionId = crypto.randomBytes(16).toString('hex')

    // Collect request metadata
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null
    const userAgent = request.headers.get('user-agent') || null
    const referrerUrl = request.headers.get('referer') || null

    // Insert access log record
    const { error: insertError } = await supabase
      .from('document_access_log')
      .insert({
        company_id: companyId,
        viewer_email: email.toLowerCase(),
        viewer_user_id: finalViewerUserId,
        access_type: 'dealroom_unlock',
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer_url: referrerUrl,
        session_id: sessionId,
      })

    if (insertError) {
      console.error('[dealroom/access] Insert failed:', insertError.message)
      return NextResponse.json({ error: 'Failed to log access' }, { status: 500 })
    }

    // If not an existing user, send nurture email (fire-and-forget)
    if (!isExistingUser && !authenticatedUserId) {
      try {
        const { subject, html } = dealroomAccessNurtureEmail({
          companyName: company.company_name,
        })
        await sendEmail({ to: email, subject, html })
      } catch (err) {
        console.error('[dealroom/access] Nurture email failed:', err)
        // Don't fail the request
      }
    }

    return NextResponse.json({ success: true, sessionId })
  } catch (error) {
    console.error('[dealroom/access] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
