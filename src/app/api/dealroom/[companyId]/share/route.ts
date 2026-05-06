import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import crypto from 'crypto'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generateToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

async function hashPassword(password: string): Promise<string> {
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  return hash
}

// POST — create a shareable link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    if (!UUID_REGEX.test(companyId)) {
      return NextResponse.json({ error: 'Invalid company ID' }, { status: 400 })
    }

    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns/added this company
    const supabase = getServiceClient()
    const { data: company } = await supabase
      .from('company_pages')
      .select('user_id, added_by')
      .eq('id', companyId)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.user_id !== user.id && company.added_by !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const { password, expires_in_days, allow_download = true } = body

    const token = generateToken()
    const password_hash = password ? await hashPassword(password) : null
    const expires_at = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { data: link, error: insertError } = await supabase
      .from('dealroom_links')
      .insert({
        company_id: companyId,
        created_by: user.id,
        token,
        password_hash,
        expires_at,
        allow_download,
        is_active: true,
        view_count: 0,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Share link insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    return NextResponse.json({ link, token })
  } catch (error) {
    console.error('Share POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET — list all share links for a company
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    if (!UUID_REGEX.test(companyId)) {
      return NextResponse.json({ error: 'Invalid company ID' }, { status: 400 })
    }

    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    const { data: links, error } = await supabase
      .from('dealroom_links')
      .select('id, token, expires_at, allow_download, is_active, view_count, last_viewed_at, created_at')
      .eq('company_id', companyId)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Share links GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    return NextResponse.json({ links: links || [] })
  } catch (error) {
    console.error('Share GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
