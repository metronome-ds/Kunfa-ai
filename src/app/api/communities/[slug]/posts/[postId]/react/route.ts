import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// POST /api/communities/[slug]/posts/[postId]/react — toggle reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug, postId } = await params
    const community = await getCommunityBySlug(slug)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const profileId = await getProfileId(user.id)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const membership = await requireMembership(community.id, profileId)
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const body = await request.json()
    const validEmojis = ['👍', '🔥', '💡', '❓']
    if (!validEmojis.includes(body.emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('community_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', profileId)
      .eq('emoji', body.emoji)
      .maybeSingle()

    if (existing) {
      // Toggle off
      await supabase.from('community_reactions').delete().eq('id', existing.id)
    } else {
      // Toggle on
      await supabase.from('community_reactions').insert({
        post_id: postId,
        user_id: profileId,
        emoji: body.emoji,
      })
    }

    // Return updated counts for this post
    const { data: reactions } = await supabase
      .from('community_reactions')
      .select('emoji, user_id')
      .eq('post_id', postId)

    const reactionCounts: Record<string, { count: number; hasReacted: boolean }> = {}
    for (const r of (reactions || [])) {
      if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, hasReacted: false }
      reactionCounts[r.emoji].count++
      if (r.user_id === profileId) reactionCounts[r.emoji].hasReacted = true
    }

    return NextResponse.json({ reactions: reactionCounts })
  } catch (error) {
    console.error('[communities/posts/react] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
