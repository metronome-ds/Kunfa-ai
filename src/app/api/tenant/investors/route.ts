import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getTenantFromHeaders } from '@/lib/tenant-context'

// Schema-accurate shape of what we SELECT from profiles. Columns that do not
// exist on profiles (check_size_min/max, country, is_accredited) are mapped
// below: ticket_size_min/max, company_country. is_accredited is surfaced from
// tenant_invitation_codes.notes if needed — not from profiles.
interface ProfileShape {
  id: string
  user_id: string | null
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  fund_name: string | null
  company_name: string | null
  sector_interests: string[] | null
  stage_focus: string[] | null
  ticket_size_min: number | null
  ticket_size_max: number | null
  company_country: string | null
  linkedin_url: string | null
  role: string | null
}

interface MemberRow {
  user_id: string
  created_at: string
  profiles: ProfileShape | ProfileShape[] | null
}

const INVESTOR_ROLES = new Set(['investor', 'vc', 'angel', 'gp', 'lp'])

export async function GET(request: NextRequest) {
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
    .select('entity_id')
    .eq('id', tenantHeader.id)
    .single()
  const entityId = tenant?.entity_id
  if (!entityId) return NextResponse.json({ data: [] })

  const { searchParams } = new URL(request.url)
  const search = (searchParams.get('search') || '').toLowerCase()
  const sector = searchParams.get('sector') || ''
  const minCheck = searchParams.get('min_check') ? Number(searchParams.get('min_check')) : null

  const { data, error } = await db
    .from('entity_members')
    .select(
      `
      user_id, created_at,
      profiles:profiles!inner(id, user_id, full_name, avatar_url, job_title, fund_name, company_name, sector_interests, stage_focus, ticket_size_min, ticket_size_max, company_country, linkedin_url, role)
    `,
    )
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .limit(500)

  if (error) {
    console.error('[TENANT-INVESTORS] Query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data || []) as unknown as MemberRow[]
  const flat = rows
    .map((m) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return p ? { ...p, joined_at: m.created_at } : null
    })
    .filter((p): p is ProfileShape & { joined_at: string } => !!p)
    .filter((p) => p.role !== null && INVESTOR_ROLES.has(p.role))
    // Normalize the response shape to match what the client expects: keep
    // check_size_min/check_size_max / country for wire compatibility.
    .map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      job_title: p.job_title,
      fund_name: p.fund_name,
      company_name: p.company_name,
      sector_interests: p.sector_interests,
      stage_focus: p.stage_focus,
      check_size_min: p.ticket_size_min,
      check_size_max: p.ticket_size_max,
      country: p.company_country,
      linkedin_url: p.linkedin_url,
      is_accredited: null as boolean | null,
      joined_at: p.joined_at,
    }))

  let filtered = flat
  if (search) {
    filtered = filtered.filter((p) => {
      const hay = [p.full_name, p.fund_name, p.company_name, p.job_title]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(search)
    })
  }
  if (sector) {
    filtered = filtered.filter((p) => (p.sector_interests || []).includes(sector))
  }
  if (minCheck !== null) {
    filtered = filtered.filter((p) => (p.check_size_max || 0) >= minCheck)
  }

  return NextResponse.json({ data: filtered })
}
