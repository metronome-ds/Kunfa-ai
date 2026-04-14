import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// GET /api/communities/[slug]/feed — paginated feed
export async function GET(
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

    const supabase = getServiceClient()
    const cursor = request.nextUrl.searchParams.get('cursor')
    const limit = 20

    // Get top-level posts (no parent, no deal scope — general feed)
    let query = supabase
      .from('community_posts')
      .select('*')
      .eq('community_id', community.id)
      .is('parent_id', null)
      .is('community_deal_id', null)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: posts } = await query

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null })
    }

    const hasMore = posts.length > limit
    const pagePosts = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore ? pagePosts[pagePosts.length - 1].created_at : null

    // Get author profiles
    const authorIds = [...new Set(pagePosts.map(p => p.user_id))]
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', authorIds)

    const authorMap = new Map((authors || []).map(a => [a.id, a]))

    // Get reply counts
    const postIds = pagePosts.map(p => p.id)
    const { data: replyCounts } = await supabase
      .from('community_posts')
      .select('parent_id')
      .in('parent_id', postIds)

    // Get reactions
    const { data: reactions } = await supabase
      .from('community_reactions')
      .select('post_id, emoji, user_id')
      .in('post_id', postIds)

    const enriched = pagePosts.map(post => {
      const author = authorMap.get(post.user_id)
      const replyCount = (replyCounts || []).filter(r => r.parent_id === post.id).length
      const postReactions = (reactions || []).filter(r => r.post_id === post.id)

      const reactionCounts: Record<string, { count: number; hasReacted: boolean }> = {}
      for (const r of postReactions) {
        if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, hasReacted: false }
        reactionCounts[r.emoji].count++
        if (r.user_id === profileId) reactionCounts[r.emoji].hasReacted = true
      }

      return {
        id: post.id,
        content: post.content,
        authorName: author?.full_name || author?.email || 'Unknown',
        authorId: post.user_id,
        createdAt: post.created_at,
        replyCount,
        reactions: reactionCounts,
      }
    })

    return NextResponse.json({ posts: enriched, nextCursor })
  } catch (error) {
    console.error('[communities/feed] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
