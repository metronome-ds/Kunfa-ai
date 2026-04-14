import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// PATCH /api/communities/[slug]/deals/[dealId]/interest — update interest
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; dealId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug, dealId } = await params
    const community = await getCommunityBySlug(slug)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const profileId = await getProfileId(user.id)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const membership = await requireMembership(community.id, profileId)
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const body = await request.json()
    const validStatuses = ['pass', 'watching', 'interested', 'committed']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Upsert interest
    const { error } = await supabase
      .from('community_deal_interest')
      .upsert(
        {
          community_deal_id: dealId,
          user_id: profileId,
          status: body.status,
          commitment_amount: body.commitmentAmount || null,
          notes: body.notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'community_deal_id,user_id' }
      )

    if (error) {
      console.error('[communities/deals/interest] Error:', error)
      return NextResponse.json({ error: 'Failed to update interest' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[communities/deals/interest] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
