import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// GET /api/communities/[slug] — get community details
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

    const [{ count: memberCount }, { count: dealCount }] = await Promise.all([
      supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', community.id).eq('status', 'active'),
      supabase.from('community_deals').select('*', { count: 'exact', head: true }).eq('community_id', community.id).eq('status', 'active'),
    ])

    return NextResponse.json({
      community: {
        ...community,
        memberCount: memberCount || 0,
        dealCount: dealCount || 0,
        userRole: membership.role,
      }
    })
  } catch (error) {
    console.error('[communities/slug] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/communities/[slug] — update community (admin only)
export async function PATCH(
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
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.thesis !== undefined) updates.thesis = body.thesis
    if (body.dealSharing !== undefined) updates.deal_sharing = body.dealSharing
    if (body.membershipType !== undefined) updates.membership_type = body.membershipType
    if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('communities')
      .update(updates)
      .eq('id', community.id)
      .select()
      .single()

    if (error) {
      console.error('[communities/slug] Update error:', error)
      return NextResponse.json({ error: 'Failed to update community' }, { status: 500 })
    }

    return NextResponse.json({ community: data })
  } catch (error) {
    console.error('[communities/slug] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
