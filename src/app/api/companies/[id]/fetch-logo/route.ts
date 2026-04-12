import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { extractDomain, fetchLogoUrl } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/companies/[id]/fetch-logo
 * Attempts to auto-fetch a company logo from its website_url.
 * Tries Clearbit Logo API first, falls back to Google Favicon.
 * Updates logo_url in the database if successful.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminDb = getSupabase()

    // Fetch the company
    const { data: company, error } = await adminDb
      .from('company_pages')
      .select('id, website_url, logo_url')
      .eq('id', id)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Skip if logo already exists
    if (company.logo_url) {
      return NextResponse.json({ logo_url: company.logo_url, skipped: true })
    }

    const domain = extractDomain(company.website_url)
    if (!domain) {
      return NextResponse.json({ error: 'No valid website URL' }, { status: 400 })
    }

    const logoUrl = await fetchLogoUrl(domain)
    if (!logoUrl) {
      return NextResponse.json({ error: 'Could not fetch logo' }, { status: 404 })
    }

    // Update the company record
    await adminDb
      .from('company_pages')
      .update({ logo_url: logoUrl })
      .eq('id', id)

    return NextResponse.json({ logo_url: logoUrl, source: logoUrl.includes('clearbit') ? 'clearbit' : 'google' })
  } catch (error) {
    console.error('[FETCH-LOGO] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
