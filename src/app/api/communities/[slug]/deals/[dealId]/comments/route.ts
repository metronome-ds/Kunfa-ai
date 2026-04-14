import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// GET /api/communities/[slug]/deals/[dealId]/comments — deal discussion
export async function GET(
  _request: NextRequest,
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

    const supabase = getServiceClient()

    // Get all posts for this deal
    const { data: posts } = await supabase
      .from('community_posts')
      .select('*')
      .eq('community_deal_id', dealId)
      .order('created_at', { ascending: true })

    if (!posts || posts.length === 0) return NextResponse.json({ comments: [] })

    // Get author profiles
    const authorIds = [...new Set(posts.map(p => p.user_id))]
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', authorIds)

    const authorMap = new Map((authors || []).map(a => [a.id, a]))

    // Get reactions
    const postIds = posts.map(p => p.id)
    const { data: reactions } = await supabase
      .from('community_reactions')
      .select('post_id, emoji, user_id')
      .in('post_id', postIds)

    const enriched = posts.map(post => {
      const author = authorMap.get(post.user_id)
      const postReactions = (reactions || []).filter(r => r.post_id === post.id)

      // Group reactions by emoji with counts
      const reactionCounts: Record<string, { count: number; hasReacted: boolean }> = {}
      for (const r of postReactions) {
        if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, hasReacted: false }
        reactionCounts[r.emoji].count++
        if (r.user_id === profileId) reactionCounts[r.emoji].hasReacted = true
      }

      return {
        id: post.id,
        content: post.content,
        parentId: post.parent_id,
        authorName: author?.full_name || author?.email || 'Unknown',
        authorId: post.user_id,
        createdAt: post.created_at,
        reactions: reactionCounts,
      }
    })

    // Organize into threads: top-level + replies
    const topLevel = enriched.filter(p => !p.parentId)
    const replies = enriched.filter(p => p.parentId)
    const threaded = topLevel.map(post => ({
      ...post,
      replies: replies.filter(r => r.parentId === post.id),
    }))

    return NextResponse.json({ comments: threaded })
  } catch (error) {
    console.error('[communities/deals/comments] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
