import { NextRequest, NextResponse } from 'next/server'
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

    const body = await request.json()
    const companies = body.companies as Record<string, unknown>[]

    if (!Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json({ error: 'companies array is required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const batchId = `crunchbase_${today}`

    let imported = 0
    let skipped = 0

    for (const raw of companies) {
      const rawName = (raw.name || raw.organizationName || raw.company_name || '') as string
      if (!rawName) {
        skipped++
        continue
      }

      // Check for duplicate: same raw_name + raw_source
      const { data: existing } = await supabase
        .from('company_imports')
        .select('id')
        .eq('raw_name', rawName)
        .eq('raw_source', 'crunchbase')
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      const rawDescription = (raw.shortDescription || raw.description || raw.short_description || null) as string | null
      const rawWebsite = (raw.websiteUrl || raw.website || raw.website_url || null) as string | null
      const rawLinkedin = (raw.linkedinUrl || raw.linkedin || raw.linkedin_url || null) as string | null
      const rawCountry = (raw.country || raw.locationGroups || raw.headquartersLocation || raw.headquarters_location || null) as string | null
      const rawSector = (raw.categories || raw.categoryGroups || raw.industryGroups || raw.industry || null) as string | null
      const rawFundingTotal = (raw.fundingTotal || raw.totalFundingAmount || raw.total_funding_amount || null) as string | null
      const rawLastFundingDate = (raw.lastFundingDate || raw.last_funding_date || null) as string | null
      const rawEmployeeCount = (raw.numberOfEmployees || raw.numEmployeesEnum || raw.employee_count || null) as string | null
      const rawFounderNames = (raw.founderNames || raw.founders || raw.founder_names || null) as string | null
      const rawFoundedYear = (raw.foundedOn || raw.foundedDate || raw.founded_on || null) as string | null
      const rawSourceUrl = (raw.url || raw.crunchbaseUrl || raw.source_url || null) as string | null

      // Stringify arrays/objects for text columns
      const stringify = (v: unknown): string | null => {
        if (v === null || v === undefined) return null
        if (typeof v === 'string') return v
        return JSON.stringify(v)
      }

      const { error: insertError } = await supabase
        .from('company_imports')
        .insert({
          raw_name: rawName,
          raw_description: stringify(rawDescription),
          raw_website: stringify(rawWebsite),
          raw_linkedin: stringify(rawLinkedin),
          raw_country: stringify(rawCountry),
          raw_sector: stringify(rawSector),
          raw_funding_total: stringify(rawFundingTotal),
          raw_last_funding_date: stringify(rawLastFundingDate),
          raw_employee_count: stringify(rawEmployeeCount),
          raw_founder_names: stringify(rawFounderNames),
          raw_founded_year: stringify(rawFoundedYear),
          raw_source: 'crunchbase',
          raw_source_url: stringify(rawSourceUrl),
          raw_data: raw,
          batch_id: batchId,
          status: 'raw',
        })

      if (insertError) {
        console.error('[IMPORT] Failed to insert:', rawName, insertError.message)
        skipped++
      } else {
        imported++
      }
    }

    console.log(`[IMPORT] Crunchbase batch ${batchId}: ${imported} imported, ${skipped} skipped`)
    return NextResponse.json({ success: true, batch_id: batchId, imported, skipped })
  } catch (error) {
    console.error('[IMPORT] Crunchbase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
