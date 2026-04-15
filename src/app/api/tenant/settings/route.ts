import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getTenantFromHeaders } from '@/lib/tenant-context'

/**
 * Checks if the current user is a tenant admin (owner/admin of the tenant's entity).
 */
async function checkTenantAdmin(request: NextRequest) {
  const tenantHeader = getTenantFromHeaders(request.headers)
  if (!tenantHeader) return { error: 'Not in tenant context', status: 403 }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const db = getSupabase()

  // Get tenant's entity_id
  const { data: tenant } = await db
    .from('tenants')
    .select('id, entity_id')
    .eq('id', tenantHeader.id)
    .maybeSingle()

  if (!tenant?.entity_id) return { error: 'Tenant has no linked entity', status: 403 }

  // Get user's profile ID
  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return { error: 'Profile not found', status: 403 }

  // Check if user is admin/owner of the tenant's entity
  const { data: membership } = await db
    .from('entity_members')
    .select('role')
    .eq('entity_id', tenant.entity_id)
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Insufficient permissions', status: 403 }
  }

  return { tenantId: tenant.id, userId: user.id, profileId: profile.id }
}

/**
 * GET /api/tenant/settings — get current tenant settings
 */
export async function GET(request: NextRequest) {
  const auth = await checkTenantAdmin(request)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const db = getSupabase()
  const { data: tenant } = await db
    .from('tenants')
    .select('*')
    .eq('id', auth.tenantId)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ tenant })
}

/**
 * PUT /api/tenant/settings — update tenant settings (client admin)
 */
export async function PUT(request: NextRequest) {
  const auth = await checkTenantAdmin(request)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()

  // Client admins can only update a subset of fields
  const allowedFields = [
    'display_name', 'tagline', 'welcome_message', 'description',
    'logo_url', 'logo_dark_url', 'favicon_url', 'primary_color', 'secondary_color', 'accent_color',
    'login_background_url',
    'email_from_name', 'support_email',
    'signup_mode', 'require_accreditation', 'require_nda', 'nda_document_url',
    'privacy_policy_url', 'terms_url', 'show_powered_by',
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
    .eq('id', auth.tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tenant })
}
