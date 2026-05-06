import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// PATCH /api/communities/[slug]/members/[userId] — update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug, userId } = await params
    const community = await getCommunityBySlug(slug)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const profileId = await getProfileId(user.id)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const membership = await requireMembership(community.id, profileId)
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validRoles = ['admin', 'deal_lead', 'member', 'observer']
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { error } = await supabase
      .from('community_members')
      .update({ role: body.role })
      .eq('community_id', community.id)
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) {
      console.error('[communities/members] Update error:', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[communities/members] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/communities/[slug]/members/[userId] — remove member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug, userId } = await params
    const community = await getCommunityBySlug(slug)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const profileId = await getProfileId(user.id)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const membership = await requireMembership(community.id, profileId)
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Can't remove yourself if you're the only admin
    if (userId === profileId) {
      const supabase = getServiceClient()
      const { count } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', community.id)
        .eq('role', 'admin')
        .eq('status', 'active')

      if ((count || 0) <= 1) {
        return NextResponse.json({ error: 'Cannot remove the only admin' }, { status: 400 })
      }
    }

    const supabase = getServiceClient()
    const { error } = await supabase
      .from('community_members')
      .update({ status: 'removed' })
      .eq('community_id', community.id)
      .eq('user_id', userId)

    if (error) {
      console.error('[communities/members] Delete error:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[communities/members] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
