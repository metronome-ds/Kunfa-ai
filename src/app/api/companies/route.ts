import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { company_name, sector, stage, raise_amount, description, team_size, founded_year, pdf_url } = body

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Generate slug
    const slug = company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + uuid().slice(0, 8)

    // Generate claim token for founder claim flow
    const claimToken = crypto.randomBytes(12).toString('hex')

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
        pdf_url: pdf_url || null,
        source: 'investor_added',
        added_by: user.id,
        claim_token: claimToken,
        claim_status: 'unclaimed',
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

    // Auto-populate deal room with uploaded pitch deck
    if (pdf_url && companyPage.id) {
      try {
        await supabase.from('dealroom_documents').insert({
          company_id: companyPage.id,
          uploaded_by: user.id,
          file_name: 'pitch-deck.pdf',
          file_url: pdf_url,
          file_size: 0,
          file_type: 'application/pdf',
          category: 'pitch_deck',
          is_public: true,
        })
      } catch (drErr) {
        console.error('Failed to create dealroom doc (continuing):', drErr)
      }
    }

    return NextResponse.json({
      companyPageId: companyPage.id,
      dealId: deal.id,
      slug,
      claimToken,
    })
  } catch (error) {
    console.error('Companies POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
