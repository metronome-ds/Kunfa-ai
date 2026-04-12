import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server'
import { requirePermission } from '@/lib/permissions'
import { extractDomain, fetchLogoUrl } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

const EDITABLE_FIELDS = [
  'company_name',
  'description',
  'one_liner',
  'industry',
  'stage',
  'country',
  'headquarters',
  'website_url',
  'linkedin_url',
  'company_linkedin_url',
  'logo_url',
  'raise_amount',
  'team_size',
  'founded_year',
  'founder_name',
  'founder_title',
  'is_raising',
  'raising_amount',
  'raising_instrument',
  'raising_target_close',
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check: only owner/admin can edit
    try {
      await requirePermission(user.id, 'edit')
    } catch {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check ownership: added_by OR user_id must match
    const { data: company, error: fetchErr } = await supabase
      .from('company_pages')
      .select('id, added_by, user_id')
      .eq('id', id)
      .single()

    if (fetchErr || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.added_by !== user.id && company.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Only allow known fields
    const updates: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        const val = body[field]
        if (field === 'raise_amount') {
          updates[field] = val ? Number(val) : null
        } else if (field === 'team_size' || field === 'founded_year') {
          updates[field] = val ? Number(val) : null
        } else if (field === 'is_raising') {
          updates[field] = val === true
        } else {
          updates[field] = val || null
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateErr } = await supabase
      .from('company_pages')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (updateErr) {
      console.error('Failed to update company:', updateErr)
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
    }

    // Auto-fetch logo when website_url is updated and logo_url is still null
    if (updates.website_url && !updated.logo_url) {
      const domain = extractDomain(updates.website_url as string)
      if (domain) {
        fetchLogoUrl(domain).then(async (logoUrl) => {
          if (logoUrl) {
            await supabase
              .from('company_pages')
              .update({ logo_url: logoUrl })
              .eq('id', id)
          }
        }).catch((err) => console.error('[FETCH-LOGO] Auto-fetch error:', err))
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Companies PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
