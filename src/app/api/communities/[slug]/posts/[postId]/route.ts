import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'

// DELETE /api/communities/[slug]/posts/[postId] — delete a post
export async function DELETE(
  _request: NextRequest,
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

    const supabase = getServiceClient()

    // Get the post to check ownership
    const { data: post } = await supabase
      .from('community_posts')
      .select('user_id')
      .eq('id', postId)
      .eq('community_id', community.id)
      .maybeSingle()

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    // Only author or admin can delete
    if (post.user_id !== profileId && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 })
    }

    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)

    if (error) {
      console.error('[communities/posts] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[communities/posts] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
