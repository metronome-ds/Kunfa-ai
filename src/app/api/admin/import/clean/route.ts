import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const CLEANING_SYSTEM_PROMPT = `You are a data cleaning assistant. Clean and normalize the following startup data. Return ONLY valid JSON with these fields:
- clean_name: Properly capitalized company name
- clean_one_liner: One sentence describing what they do (max 150 chars). If description is empty, infer from name/sector.
- clean_description: 2-3 sentence description
- clean_website: Normalized URL (add https:// if missing, remove trailing slashes)
- clean_linkedin: Normalized LinkedIn URL
- clean_country: ISO country name (e.g., "United Arab Emirates", "Saudi Arabia")
- clean_sector: One of: fintech, healthtech, edtech, proptech, logistics, ecommerce, saas, ai, cleantech, agritech, foodtech, mobility, insurtech, legaltech, hrtech, other
- clean_stage: One of: pre-seed, seed, series-a, series-b, series-c, growth, unknown
- clean_founded_year: 4-digit year or null
- clean_funding_total_usd: Number in USD or null
- clean_employee_count: Integer or null
- clean_founder_name: Primary founder name or null
- clean_founder_email: Founder email or null
- is_valid: true/false (false if company name is gibberish, test data, or non-startup)
- rejection_reason: null or reason string if is_valid is false`

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

    // Fetch up to 20 raw records
    let query = supabase
      .from('company_imports')
      .select('*')
      .eq('status', 'raw')
      .order('imported_at', { ascending: true })
      .limit(20)

    if (batchFilter) {
      query = query.eq('batch_id', batchFilter)
    }

    const { data: records, error: fetchError } = await query

    if (fetchError) {
      console.error('[CLEAN] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ success: true, cleaned: 0, rejected: 0, message: 'No raw records to clean' })
    }

    let cleaned = 0
    let rejected = 0

    for (const record of records) {
      try {
        // Build context for Claude
        const context = JSON.stringify({
          name: record.raw_name,
          description: record.raw_description,
          website: record.raw_website,
          linkedin: record.raw_linkedin,
          country: record.raw_country,
          sector: record.raw_sector,
          funding_total: record.raw_funding_total,
          last_funding_date: record.raw_last_funding_date,
          employee_count: record.raw_employee_count,
          founder_names: record.raw_founder_names,
          founded_year: record.raw_founded_year,
        })

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: CLEANING_SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: `Clean this startup data:\n${context}` },
          ],
        })

        // Extract text from response
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('')

        // Parse JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.error('[CLEAN] No JSON in response for:', record.raw_name)
          continue
        }

        const result = JSON.parse(jsonMatch[0]) as Record<string, unknown>

        if (result.is_valid === false) {
          // Rejected
          const { error: updateErr } = await supabase
            .from('company_imports')
            .update({
              status: 'rejected',
              rejection_reason: (result.rejection_reason as string) || 'Invalid data',
              cleaned_at: new Date().toISOString(),
            })
            .eq('id', record.id)
          if (updateErr) {
            console.error('[CLEAN] Update (reject) failed for:', record.raw_name, updateErr.message)
          } else {
            rejected++
          }
        } else {
          // Cleaned
          const { error: updateErr } = await supabase
            .from('company_imports')
            .update({
              clean_name: (result.clean_name as string) || record.raw_name,
              clean_one_liner: (result.clean_one_liner as string) || null,
              clean_description: (result.clean_description as string) || null,
              clean_website: (result.clean_website as string) || null,
              clean_linkedin: (result.clean_linkedin as string) || null,
              clean_country: (result.clean_country as string) || null,
              clean_sector: (result.clean_sector as string) || null,
              clean_stage: (result.clean_stage as string) || null,
              clean_founded_year: result.clean_founded_year ? Number(result.clean_founded_year) : null,
              clean_funding_total_usd: result.clean_funding_total_usd ? Number(result.clean_funding_total_usd) : null,
              clean_employee_count: result.clean_employee_count ? Number(result.clean_employee_count) : null,
              clean_founder_name: (result.clean_founder_name as string) || null,
              clean_founder_email: (result.clean_founder_email as string) || null,
              status: 'cleaned',
              cleaned_at: new Date().toISOString(),
            })
            .eq('id', record.id)
          if (updateErr) {
            console.error('[CLEAN] Update (clean) failed for:', record.raw_name, updateErr.message)
          } else {
            cleaned++
          }
        }
      } catch (err) {
        console.error('[CLEAN] Error processing:', record.raw_name, err)
      }
    }

    console.log(`[CLEAN] Processed ${records.length}: ${cleaned} cleaned, ${rejected} rejected`)
    return NextResponse.json({ success: true, processed: records.length, cleaned, rejected })
  } catch (error) {
    console.error('[CLEAN] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
