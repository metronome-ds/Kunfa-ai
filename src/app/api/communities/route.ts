import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getUserTier, canAccessFeature } from '@/lib/subscription'
import { getServiceClient, getProfileId, generateSlug } from '@/lib/community'

// POST /api/communities — create community (requires Fund tier)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check Fund tier
    const tierResult = await getUserTier(user.id)
    if (!canAccessFeature(tierResult.tier, 'create_community')) {
      return NextResponse.json({ error: 'Fund tier required to create communities' }, { status: 403 })
    }

    const profileId = await getProfileId(user.id)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    const { name, description, thesis, membershipType, mode, dealSharing } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Community name is required' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const slug = generateSlug(name)

    // Create community
    const { data: community, error: createErr } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        slug,
        description: description || null,
        thesis: thesis || null,
        membership_type: membershipType || 'invite',
        mode: mode || 'network',
        deal_sharing: dealSharing || 'admin_only',
        created_by: profileId,
      })
      .select()
      .single()

    if (createErr) {
      console.error('[communities] Create error:', createErr)
      return NextResponse.json({ error: 'Failed to create community' }, { status: 500 })
    }

    // Add creator as admin member
    await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: profileId,
      role: 'admin',
      status: 'active',
    })

    return NextResponse.json({ community })
  } catch (error) {
    console.error('[communities] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/communities — list user's communities
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profileId = await getProfileId(user.id)
    if (!profileId) return NextResponse.json({ communities: [] })

    const supabase = getServiceClient()

    // Get user's active memberships
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id, role')
      .eq('user_id', profileId)
      .eq('status', 'active')

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ communities: [] })
    }

    const communityIds = memberships.map(m => m.community_id)

    // Get communities
    const { data: communities } = await supabase
      .from('communities')
      .select('*')
      .in('id', communityIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (!communities) return NextResponse.json({ communities: [] })

    // Get member counts and deal counts
    const enriched = await Promise.all(
      communities.map(async (c) => {
        const [{ count: memberCount }, { count: dealCount }] = await Promise.all([
          supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', c.id).eq('status', 'active'),
          supabase.from('community_deals').select('*', { count: 'exact', head: true }).eq('community_id', c.id).eq('status', 'active'),
        ])
        const membership = memberships.find(m => m.community_id === c.id)
        return { ...c, memberCount: memberCount || 0, dealCount: dealCount || 0, userRole: membership?.role || 'member' }
      })
    )

    return NextResponse.json({ communities: enriched })
  } catch (error) {
    console.error('[communities] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
