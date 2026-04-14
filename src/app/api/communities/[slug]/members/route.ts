import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// GET /api/communities/[slug]/members — list members
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

    const { data: members } = await supabase
      .from('community_members')
      .select('id, user_id, role, status, invited_email, joined_at')
      .eq('community_id', community.id)
      .order('joined_at', { ascending: true })

    if (!members) return NextResponse.json({ members: [] })

    // Get profile info for active members
    const activeUserIds = members.filter(m => m.status === 'active').map(m => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', activeUserIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const enriched = members.map(m => {
      const profile = profileMap.get(m.user_id)
      return {
        id: m.id,
        userId: m.user_id,
        role: m.role,
        status: m.status,
        name: profile?.full_name || null,
        email: m.status === 'pending' ? m.invited_email : (profile?.email || m.invited_email),
        joinedAt: m.joined_at,
      }
    })

    return NextResponse.json({ members: enriched })
  } catch (error) {
    console.error('[communities/members] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
