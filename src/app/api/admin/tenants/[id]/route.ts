import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isSuperAdmin } from '@/lib/super-admins'

// GET /api/admin/tenants/[id] — get tenant details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const db = getSupabase()
  const { data: tenant, error } = await db
    .from('tenants')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ tenant })
}

// PUT /api/admin/tenants/[id] — update tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  // Only allow updating specific fields
  const allowedFields = [
    'name', 'display_name', 'slug', 'tagline', 'welcome_message', 'description', 'organization_type',
    'logo_url', 'logo_dark_url', 'favicon_url', 'primary_color', 'secondary_color', 'accent_color',
    'font_family', 'login_background_url', 'login_layout',
    'subdomain', 'custom_domain', 'domain_verified', 'ssl_provisioned',
    'email_from_name', 'email_from_address', 'email_reply_to', 'support_email',
    'features', 'signup_mode', 'default_member_role',
    'require_accreditation', 'require_nda', 'nda_document_url',
    'privacy_policy_url', 'terms_url', 'show_powered_by',
    'max_members', 'max_startups', 'max_deals', 'max_documents', 'max_storage_gb',
    'license_tier', 'is_active', 'entity_id',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const db = getSupabase()
  const { data: tenant, error } = await db
    .from('tenants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tenant })
}
