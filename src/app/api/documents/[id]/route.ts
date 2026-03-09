import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/documents/[id]?type=pitch_deck|financials|report
 *
 * Authenticated proxy for proprietary documents.
 * [id] can be a company_pages ID or a submission ID.
 *
 * Authorization:
 * - The company owner (user who uploaded) can always access
 * - Investors with the company in their pipeline (deals table)
 * - Investors with the company watchlisted (watchlist_items table)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const type = request.nextUrl.searchParams.get('type')

  if (!type || !['pitch_deck', 'financials', 'report'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type parameter. Use pitch_deck, financials, or report.' }, { status: 400 })
  }

  // Authenticate
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role for data queries (custom auth checks, not RLS)
  const db = getSupabase()

  // Resolve company page — try as company_page ID first, then as submission ID
  let companyPage: { id: string; user_id: string; submission_id: string | null; pdf_url: string | null; financials_url: string | null } | null = null
  let submissionId: string | null = null

  const { data: cp } = await db
    .from('company_pages')
    .select('id, user_id, submission_id, pdf_url, financials_url')
    .eq('id', id)
    .maybeSingle()

  if (cp) {
    companyPage = cp
    submissionId = cp.submission_id
  } else {
    // Try as submission ID
    const { data: cp2 } = await db
      .from('company_pages')
      .select('id, user_id, submission_id, pdf_url, financials_url')
      .eq('submission_id', id)
      .maybeSingle()

    if (cp2) {
      companyPage = cp2
      submissionId = id
    }
  }

  if (!companyPage) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // --- Authorization ---
  const isOwner = companyPage.user_id === user.id
  let isAuthorized = isOwner

  if (!isAuthorized) {
    // Check if investor has this company in their pipeline
    const { data: deal } = await db
      .from('deals')
      .select('id')
      .eq('created_by', user.id)
      .eq('company_id', companyPage.id)
      .maybeSingle()

    if (deal) isAuthorized = true
  }

  if (!isAuthorized) {
    // Check if investor has watchlisted this company (investor_id is profiles.id)
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profile) {
      const { data: wl } = await db
        .from('watchlist_items')
        .select('id')
        .eq('investor_id', profile.id)
        .eq('company_id', companyPage.id)
        .maybeSingle()

      if (wl) isAuthorized = true
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // --- Resolve file URL ---
  let fileUrl: string | null = null
  let filename = 'document.pdf'

  if (type === 'pitch_deck') {
    if (companyPage.pdf_url) {
      fileUrl = companyPage.pdf_url
    }
    if (!fileUrl && submissionId) {
      const { data: sub } = await db
        .from('submissions')
        .select('pitch_deck_url, pitch_deck_filename')
        .eq('id', submissionId)
        .maybeSingle()
      fileUrl = sub?.pitch_deck_url || null
      filename = sub?.pitch_deck_filename || 'pitch-deck.pdf'
    }
    if (!filename || filename === 'document.pdf') filename = 'pitch-deck.pdf'
  } else if (type === 'financials') {
    if (companyPage.financials_url) {
      fileUrl = companyPage.financials_url
    }
    if (!fileUrl && submissionId) {
      const { data: sub } = await db
        .from('submissions')
        .select('financials_url, financials_filename')
        .eq('id', submissionId)
        .maybeSingle()
      fileUrl = sub?.financials_url || null
      filename = sub?.financials_filename || 'financials.pdf'
    }
    if (!filename || filename === 'document.pdf') filename = 'financials.pdf'
  } else if (type === 'report') {
    if (!submissionId) {
      return NextResponse.json({ error: 'No submission linked' }, { status: 404 })
    }
    const { data: sub } = await db
      .from('submissions')
      .select('report_url, paid')
      .eq('id', submissionId)
      .maybeSingle()

    if (!sub?.paid && !isOwner) {
      return NextResponse.json({ error: 'Report not purchased' }, { status: 403 })
    }
    fileUrl = sub?.report_url || null
    filename = 'kunfa-readiness-report.pdf'
  }

  if (!fileUrl) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // --- Fetch from Vercel Blob and stream back ---
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      console.error(`Document proxy: blob fetch failed (${response.status}) for ${type}`)
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 502 })
    }

    const contentType = response.headers.get('content-type') || 'application/pdf'

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('Document proxy fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 502 })
  }
}
