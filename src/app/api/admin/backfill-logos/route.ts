import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { extractDomain, fetchLogoUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/backfill-logos
 * Admin-only endpoint that backfills logos for all companies
 * where logo_url IS NULL AND website_url IS NOT NULL.
 */
export async function POST() {
  try {
    const authSupabase = await createServerSupabaseClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch companies missing logos but having website_url
    const { data: companies, error } = await supabase
      .from('company_pages')
      .select('id, website_url, company_name')
      .is('logo_url', null)
      .not('website_url', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[BACKFILL] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({ success: true, processed: 0, updated: 0, failed: 0, message: 'No companies need logo backfill' })
    }

    let updated = 0
    let failed = 0

    for (const company of companies) {
      const domain = extractDomain(company.website_url)
      if (!domain) {
        failed++
        continue
      }

      try {
        const logoUrl = await fetchLogoUrl(domain)
        if (logoUrl) {
          await supabase
            .from('company_pages')
            .update({ logo_url: logoUrl })
            .eq('id', company.id)
          updated++
          console.log(`[BACKFILL] ${company.company_name}: ${logoUrl}`)
        } else {
          failed++
        }
      } catch (err) {
        console.error(`[BACKFILL] Error for ${company.company_name}:`, err)
        failed++
      }
    }

    console.log(`[BACKFILL] Done: ${companies.length} processed, ${updated} updated, ${failed} failed`)
    return NextResponse.json({ success: true, processed: companies.length, updated, failed })
  } catch (error) {
    console.error('[BACKFILL] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
