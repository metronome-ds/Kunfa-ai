import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// POST /api/communities/[slug]/deals — share a deal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const community = await getCommunityBySlug(slug)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const profileId = await getProfileId(user.id)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const membership = await requireMembership(community.id, profileId)
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    // Check deal sharing permissions
    if (community.deal_sharing === 'admin_only' && membership.role !== 'admin' && membership.role !== 'deal_lead') {
      return NextResponse.json({ error: 'Only admins can share deals in this community' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = getServiceClient()

    const insert: Record<string, unknown> = {
      community_id: community.id,
      shared_by: profileId,
    }

    if (body.companyId) {
      // Kunfa company
      insert.company_id = body.companyId
    } else {
      // External deal
      if (!body.externalCompanyName) {
        return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
      }
      insert.external_company_name = body.externalCompanyName
      insert.external_description = body.externalDescription || null
      insert.external_sector = body.externalSector || null
      insert.external_stage = body.externalStage || null
      insert.external_raise_amount = body.externalRaiseAmount || null
      insert.external_docs_url = body.externalDocsUrl || null
    }

    const { data: deal, error: createErr } = await supabase
      .from('community_deals')
      .insert(insert)
      .select()
      .single()

    if (createErr) {
      console.error('[communities/deals] Create error:', createErr)
      return NextResponse.json({ error: 'Failed to share deal' }, { status: 500 })
    }

    return NextResponse.json({ deal })
  } catch (error) {
    console.error('[communities/deals] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/communities/[slug]/deals — list deals
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const community = await getCommunityBySlug(slug)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const profileId = await getProfileId(user.id)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const membership = await requireMembership(community.id, profileId)
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const supabase = getServiceClient()

    // Fetch deals
    const { data: deals } = await supabase
      .from('community_deals')
      .select('*')
      .eq('community_id', community.id)
      .eq('status', 'active')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (!deals || deals.length === 0) return NextResponse.json({ deals: [] })

    // Get company data for Kunfa deals
    const companyIds = deals.filter(d => d.company_id).map(d => d.company_id)
    const { data: companies } = companyIds.length > 0
      ? await supabase
          .from('company_pages')
          .select('id, company_name, slug, ai_score, sector, stage, raising_amount, logo_url')
          .in('id', companyIds)
      : { data: [] }

    const companyMap = new Map((companies || []).map(c => [c.id, c]))

    // Get interest counts per deal
    const dealIds = deals.map(d => d.id)
    const { data: interests } = await supabase
      .from('community_deal_interest')
      .select('community_deal_id, status, user_id')
      .in('community_deal_id', dealIds)

    // Get comment counts per deal
    const { data: commentCounts } = await supabase
      .from('community_posts')
      .select('community_deal_id')
      .in('community_deal_id', dealIds)

    // Get sharer profiles
    const sharerIds = [...new Set(deals.map(d => d.shared_by))]
    const { data: sharers } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', sharerIds)

    const sharerMap = new Map((sharers || []).map(s => [s.id, s]))

    const enriched = deals.map(deal => {
      const company = deal.company_id ? companyMap.get(deal.company_id) : null
      const dealInterests = (interests || []).filter(i => i.community_deal_id === deal.id)
      const dealComments = (commentCounts || []).filter(c => c.community_deal_id === deal.id)
      const myInterest = dealInterests.find(i => i.user_id === profileId)
      const sharer = sharerMap.get(deal.shared_by)

      const interestBreakdown = {
        pass: dealInterests.filter(i => i.status === 'pass').length,
        watching: dealInterests.filter(i => i.status === 'watching').length,
        interested: dealInterests.filter(i => i.status === 'interested').length,
        committed: dealInterests.filter(i => i.status === 'committed').length,
      }

      return {
        ...deal,
        company,
        interestBreakdown,
        myInterest: myInterest?.status || null,
        commentCount: dealComments.length,
        sharedByName: sharer?.full_name || sharer?.email || 'Unknown',
      }
    })

    return NextResponse.json({ deals: enriched })
  } catch (error) {
    console.error('[communities/deals] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
