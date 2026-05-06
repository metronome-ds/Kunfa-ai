import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// POST /api/communities/[slug]/posts — create a post
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

    const body = await request.json()
    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data: post, error } = await supabase
      .from('community_posts')
      .insert({
        community_id: community.id,
        user_id: profileId,
        content: body.content.trim(),
        community_deal_id: body.communityDealId || null,
        parent_id: body.parentId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[communities/posts] Create error:', error)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    // Get author info
    const { data: author } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', profileId)
      .single()

    return NextResponse.json({
      post: {
        ...post,
        authorName: author?.full_name || author?.email || 'Unknown',
        authorId: profileId,
        replyCount: 0,
        reactions: {},
      }
    })
  } catch (error) {
    console.error('[communities/posts] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
