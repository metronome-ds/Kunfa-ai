import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug } from '@/lib/community'

// POST /api/communities/join-on-signup — activate pending membership after signup
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const communitySlug = body.communitySlug
    if (!communitySlug) return NextResponse.json({ error: 'Missing community slug' }, { status: 400 })

    const community = await getCommunityBySlug(communitySlug)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const profileId = await getProfileId(user.id)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const supabase = getServiceClient()

    // Check for pending invite by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', profileId)
      .single()

    if (!profile?.email) return NextResponse.json({ error: 'Profile email not found' }, { status: 404 })

    // Find pending membership matching this email
    const { data: pending } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community.id)
      .eq('invited_email', profile.email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle()

    if (pending) {
      // Activate the membership — update user_id to actual profile and set active
      await supabase
        .from('community_members')
        .update({ user_id: profileId, status: 'active' })
        .eq('id', pending.id)

      return NextResponse.json({ joined: true })
    }

    // No pending invite — check if community is open
    if (community.membership_type === 'open') {
      // Auto-join
      await supabase.from('community_members').insert({
        community_id: community.id,
        user_id: profileId,
        role: 'member',
        status: 'active',
        invited_email: profile.email,
      })
      return NextResponse.json({ joined: true })
    }

    return NextResponse.json({ joined: false, message: 'No pending invite found' })
  } catch (error) {
    console.error('[communities/join-on-signup] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
