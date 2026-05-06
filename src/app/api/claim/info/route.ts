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
      .select('id, company_name, one_liner, overall_score, industry, stage, claim_invited_email, claim_status, entity_id')
      .eq('claim_token', token)
      .single()

    if (!company || company.claim_status === 'claimed') {
      return NextResponse.json({ valid: false })
    }

    // Resolve tenant branding if company belongs to a tenant's entity
    let tenantSlug: string | null = null
    let tenantBranding: {
      name: string | null
      display_name: string | null
      logo_url: string | null
      primary_color: string | null
    } | null = null

    if (company.entity_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug, name, display_name, logo_url, primary_color')
        .eq('entity_id', company.entity_id)
        .eq('is_active', true)
        .maybeSingle()

      if (tenant) {
        tenantSlug = tenant.slug
        tenantBranding = {
          name: tenant.name,
          display_name: tenant.display_name,
          logo_url: tenant.logo_url,
          primary_color: tenant.primary_color,
        }
      }
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
      tenant_slug: tenantSlug,
      tenant_branding: tenantBranding,
    })
  } catch (error) {
    console.error('Claim info GET error:', error)
    return NextResponse.json({ valid: false })
  }
}
