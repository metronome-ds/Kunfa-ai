import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_ACCESS_TYPES = ['document_view', 'document_download'] as const
type AccessType = typeof VALID_ACCESS_TYPES[number]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { sessionId, companyId, documentId, accessType } = body as {
      sessionId?: string
      companyId?: string
      documentId?: string
      accessType?: string
    }

    if (!companyId || !UUID_REGEX.test(companyId)) {
      return NextResponse.json({ error: 'Valid companyId is required' }, { status: 400 })
    }
    if (!accessType || !VALID_ACCESS_TYPES.includes(accessType as AccessType)) {
      return NextResponse.json({ error: 'Invalid accessType' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Resolve viewer email + user_id. Prefer authenticated user; otherwise look up session.
    let viewerEmail: string | null = null
    let viewerUserId: string | null = null

    try {
      const authClient = await createServerSupabaseClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (user) {
        viewerUserId = user.id
        viewerEmail = user.email || null
      }
    } catch {
      // not authenticated
    }

    if (!viewerEmail && sessionId) {
      const { data: session } = await supabase
        .from('document_access_log')
        .select('viewer_email, viewer_user_id')
        .eq('session_id', sessionId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        viewerEmail = session.viewer_email
        viewerUserId = session.viewer_user_id || viewerUserId
      }
    }

    if (!viewerEmail) {
      return NextResponse.json({ error: 'No valid session or auth' }, { status: 401 })
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null
    const userAgent = request.headers.get('user-agent') || null
    const referrerUrl = request.headers.get('referer') || null

    const { error: insertError } = await supabase
      .from('document_access_log')
      .insert({
        company_id: companyId,
        document_id: documentId && UUID_REGEX.test(documentId) ? documentId : null,
        viewer_email: viewerEmail.toLowerCase(),
        viewer_user_id: viewerUserId,
        access_type: accessType,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer_url: referrerUrl,
        session_id: sessionId || null,
      })

    if (insertError) {
      console.error('[dealroom/track] Insert failed:', insertError.message)
      return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[dealroom/track] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
