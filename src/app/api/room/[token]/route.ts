import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET — fetch room data for a token (public, no auth)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data: link, error } = await supabase
      .from('dealroom_links')
      .select('id, company_id, token, password_hash, expires_at, allow_download, is_active, view_count')
      .eq('token', token)
      .single()

    if (error || !link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    if (!link.is_active) {
      return NextResponse.json({ error: 'This link has been deactivated' }, { status: 410 })
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
    }

    const needsPassword = !!link.password_hash

    // Fetch company info
    const { data: company } = await supabase
      .from('company_pages')
      .select('id, company_name, one_liner, industry, stage, overall_score')
      .eq('id', link.company_id)
      .single()

    // Fetch public documents
    const { data: docs } = await supabase
      .from('dealroom_documents')
      .select('id, file_name, file_url, file_size, file_type, category, description, created_at')
      .eq('company_id', link.company_id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    // Increment view count
    await supabase
      .from('dealroom_links')
      .update({
        view_count: (link.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', link.id)

    return NextResponse.json({
      needsPassword,
      allowDownload: link.allow_download,
      company: company || null,
      documents: needsPassword ? [] : (docs || []),
    })
  } catch (error) {
    console.error('Room GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — verify password and get documents
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data: link } = await supabase
      .from('dealroom_links')
      .select('id, company_id, password_hash, expires_at, allow_download, is_active')
      .eq('token', token)
      .single()

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    if (!link.is_active) {
      return NextResponse.json({ error: 'This link has been deactivated' }, { status: 410 })
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
    }

    // Verify password
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    if (hash !== link.password_hash) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    // Fetch documents
    const { data: docs } = await supabase
      .from('dealroom_documents')
      .select('id, file_name, file_url, file_size, file_type, category, description, created_at')
      .eq('company_id', link.company_id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      authenticated: true,
      allowDownload: link.allow_download,
      documents: docs || [],
    })
  } catch (error) {
    console.error('Room POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
