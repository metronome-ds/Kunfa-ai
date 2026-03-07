import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { company_name, sector, stage, raise_amount, description, team_size, founded_year } = body

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Generate slug
    const slug = company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + uuid().slice(0, 8)

    // Create company page
    const { data: companyPage, error: cpError } = await supabase
      .from('company_pages')
      .insert({
        user_id: user.id,
        company_name,
        slug,
        industry: sector || null,
        stage: stage || null,
        raise_amount: raise_amount || null,
        description: description || null,
        team_size: team_size || null,
        founded_year: founded_year || null,
        source: 'investor_added',
        added_by: user.id,
      })
      .select('id')
      .single()

    if (cpError) {
      console.error('Failed to create company page:', cpError)
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }

    // Create deal in pipeline
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        created_by: user.id,
        company_id: companyPage.id,
        stage: 'sourced',
        sector: sector || null,
        raise_amount: raise_amount || null,
        stage_changed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (dealError) {
      console.error('Failed to create deal:', dealError)
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }

    return NextResponse.json({
      companyPageId: companyPage.id,
      dealId: deal.id,
      slug,
    })
  } catch (error) {
    console.error('Companies POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
