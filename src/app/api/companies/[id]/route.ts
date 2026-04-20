import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { extractDomain, fetchLogoUrl } from '@/lib/utils'
import { getProfileIdForAuthUser } from '@/lib/tenant-auth'
import { getTenantFromHeaders } from '@/lib/tenant-context'
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

/**
 * DELETE /api/companies/[id]
 * Soft-delete a company page. Requires entity admin (owner/admin of the
 * company's entity). Sets deleted_at + is_public=false. Cascades cleanup
 * to related deals, watchlist, pipeline entries.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const db = getSupabase()

    // Load company
    const { data: company, error: fetchErr } = await db
      .from('company_pages')
      .select('id, company_name, slug, entity_id, deleted_at')
      .eq('id', id)
      .single()

    if (fetchErr || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.deleted_at) {
      return NextResponse.json({ error: 'Company already deleted' }, { status: 404 })
    }

    // Entity admin check
    if (!company.entity_id) {
      // No entity — check if user is platform admin or the original adder
      const { data: cp } = await db
        .from('company_pages')
        .select('added_by, user_id')
        .eq('id', id)
        .single()
      if (cp?.added_by !== user.id && cp?.user_id !== user.id) {
        return NextResponse.json({ error: 'Only the company owner or an entity admin can delete' }, { status: 403 })
      }
    } else {
      const profileId = await getProfileIdForAuthUser(user.id)
      if (!profileId) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
      }
      const { data: membership } = await db
        .from('entity_members')
        .select('role')
        .eq('entity_id', company.entity_id)
        .eq('user_id', profileId)
        .eq('status', 'active')
        .maybeSingle()

      if (membership?.role !== 'owner' && membership?.role !== 'admin') {
        return NextResponse.json({ error: 'Only entity admins can delete companies' }, { status: 403 })
      }
    }

    // Soft delete
    const { error: deleteErr } = await db
      .from('company_pages')
      .update({
        deleted_at: new Date().toISOString(),
        is_public: false,
      })
      .eq('id', id)

    if (deleteErr) {
      console.error('[DELETE COMPANY] Soft delete failed:', deleteErr)
      return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
    }

    // Cascade cleanup (non-fatal — log errors but don't fail the response)
    const cleanups = [
      db.from('deals').delete().eq('company_id', id),
      db.from('watchlist_items').delete().eq('company_id', id),
    ]
    const results = await Promise.allSettled(cleanups)
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('[DELETE COMPANY] Cascade cleanup error:', r.reason)
      }
    }

    // Audit log (if in tenant context)
    const tenantHeader = getTenantFromHeaders(request.headers)
    if (tenantHeader) {
      const profileId = await getProfileIdForAuthUser(user.id)
      if (profileId) {
        await db.from('tenant_audit_log').insert({
          tenant_id: tenantHeader.id,
          user_id: profileId,
          action: 'company_deleted',
          resource_type: 'company_page',
          resource_id: id,
          details: { company_name: company.company_name, slug: company.slug },
        })
      }
    }

    return NextResponse.json({ success: true, company_name: company.company_name })
  } catch (error) {
    console.error('[DELETE COMPANY] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
