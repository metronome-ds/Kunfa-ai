import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isSuperAdmin } from '@/lib/super-admins'

// GET /api/admin/tenants — list all tenants
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getSupabase()
  const { data: tenants, error } = await db
    .from('tenants')
    .select('id, name, display_name, slug, subdomain, custom_domain, is_active, primary_color, logo_url, signup_mode, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tenants: tenants || [] })
}

// POST /api/admin/tenants — create a new tenant
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, slug, subdomain, custom_domain, primary_color, secondary_color, accent_color, logo_url, tagline, signup_mode, features } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const db = getSupabase()

  // Check slug uniqueness
  const { data: existing } = await db
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
  }

  const { data: tenant, error } = await db
    .from('tenants')
    .insert({
      name,
      slug,
      subdomain: subdomain || null,
      custom_domain: custom_domain || null,
      primary_color: primary_color || '#007CF8',
      secondary_color: secondary_color || '#1F2937',
      accent_color: accent_color || '#10B981',
      logo_url: logo_url || null,
      tagline: tagline || null,
      signup_mode: signup_mode || 'invitation_only',
      features: features || {},
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tenant }, { status: 201 })
}
