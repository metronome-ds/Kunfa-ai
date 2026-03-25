import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ valid: false })
    }

    const supabase = getSupabase()

    const { data: company } = await supabase
      .from('company_pages')
      .select('id, company_name, one_liner, overall_score, industry, stage, claim_invited_email, claim_status')
      .eq('claim_token', token)
      .single()

    if (!company || company.claim_status === 'claimed') {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({
      valid: true,
      company_name: company.company_name,
      one_liner: company.one_liner,
      overall_score: company.overall_score,
      industry: company.industry,
      stage: company.stage,
      claim_invited_email: company.claim_invited_email,
      claim_status: company.claim_status,
    })
  } catch (error) {
    console.error('Claim info GET error:', error)
    return NextResponse.json({ valid: false })
  }
}
