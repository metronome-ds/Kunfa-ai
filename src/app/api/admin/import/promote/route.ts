import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { v4 as uuid } from 'uuid'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
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

    const body = await request.json().catch(() => ({}))
    const batchFilter = (body as Record<string, string>).batch_id || null

    // Fetch cleaned records
    let query = supabase
      .from('company_imports')
      .select('*')
      .eq('status', 'cleaned')
      .order('cleaned_at', { ascending: true })
      .limit(50)

    if (batchFilter) {
      query = query.eq('batch_id', batchFilter)
    }

    const { data: records, error: fetchError } = await query

    if (fetchError) {
      console.error('[PROMOTE] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ success: true, promoted: 0, duplicates: 0, message: 'No cleaned records to promote' })
    }

    let promoted = 0
    let duplicates = 0

    for (const record of records) {
      const companyName = record.clean_name || record.raw_name

      // Case-insensitive fuzzy match on company_pages
      const { data: existing } = await supabase
        .from('company_pages')
        .select('id')
        .ilike('company_name', companyName)
        .maybeSingle()

      if (existing) {
        // Duplicate
        await supabase
          .from('company_imports')
          .update({
            status: 'duplicate',
            duplicate_of: existing.id,
          })
          .eq('id', record.id)
        duplicates++
        continue
      }

      // Generate slug
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + uuid().slice(0, 8)

      // Generate claim token
      const claimToken = crypto.randomBytes(12).toString('hex')

      // Create company_pages record
      const { data: company, error: insertError } = await supabase
        .from('company_pages')
        .insert({
          company_name: companyName,
          slug,
          one_liner: record.clean_one_liner || null,
          description: record.clean_description || null,
          website_url: record.clean_website || null,
          company_linkedin_url: record.clean_linkedin || null,
          country: record.clean_country || null,
          industry: record.clean_sector || null,
          stage: record.clean_stage || null,
          founded_year: record.clean_founded_year || null,
          founder_name: record.clean_founder_name || null,
          source: 'platform_sourced',
          claim_status: 'unclaimed',
          claim_token: claimToken,
          is_public: true,
          user_id: null,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[PROMOTE] Insert failed for:', companyName, insertError.message)
        continue
      }

      // Update import record
      await supabase
        .from('company_imports')
        .update({
          status: 'promoted',
          promoted_company_id: company.id,
          promoted_at: new Date().toISOString(),
        })
        .eq('id', record.id)

      promoted++
    }

    console.log(`[PROMOTE] Processed ${records.length}: ${promoted} promoted, ${duplicates} duplicates`)
    return NextResponse.json({ success: true, processed: records.length, promoted, duplicates })
  } catch (error) {
    console.error('[PROMOTE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
