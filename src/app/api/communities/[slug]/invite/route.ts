import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getServiceClient, getProfileId, getCommunityBySlug, requireMembership } from '@/lib/community'
import { sendEmail } from '@/lib/email'

function communityInviteEmailHtml(communityName: string, inviterName: string, isExistingUser: boolean, slug: string) {
  const BASE_URL = 'https://www.kunfa.ai'
  const link = isExistingUser
    ? `${BASE_URL}/communities/${slug}`
    : `${BASE_URL}/signup?community=${slug}`
  const btnText = isExistingUser ? 'View Community' : 'Create Account & Join'

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8f9fb;padding:40px 20px">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
<div style="background:#0168FE;padding:20px 24px"><span style="color:white;font-size:20px;font-weight:700">Kunfa</span></div>
<div style="padding:32px 24px">
<h2 style="margin:0 0 12px;color:#111827;font-size:20px">You're invited to join ${communityName}</h2>
<p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 8px">${inviterName} has invited you to join <strong>${communityName}</strong> on Kunfa.</p>
<p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px">${isExistingUser ? 'Click below to view the community.' : 'Create your free Kunfa account to get started.'}</p>
<a href="${link}" style="display:inline-block;background:#0168FE;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${btnText}</a>
</div>
<div style="padding:16px 24px;border-top:1px solid #e5e7eb;text-align:center"><p style="color:#9ca3af;font-size:12px;margin:0">Kunfa — Deal Flow Intelligence</p></div>
</div></body></html>`
}

// POST /api/communities/[slug]/invite — invite members (admin only)
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
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const emails: string[] = (body.emails || []).map((e: string) => e.trim().toLowerCase()).filter(Boolean)

    if (emails.length === 0) {
      return NextResponse.json({ error: 'At least one email is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Get inviter name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', profileId)
      .single()
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'A community admin'

    let invited = 0
    let alreadyMembers = 0

    for (const email of emails) {
      // Check if already a member
      const { data: existingByEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingByEmail) {
        // Check if already a community member
        const { data: existingMember } = await supabase
          .from('community_members')
          .select('id, status')
          .eq('community_id', community.id)
          .eq('user_id', existingByEmail.id)
          .maybeSingle()

        if (existingMember && existingMember.status === 'active') {
          alreadyMembers++
          continue
        }

        if (existingMember) {
          // Re-activate removed member
          await supabase
            .from('community_members')
            .update({ status: 'active', role: 'member', invited_by: profileId })
            .eq('id', existingMember.id)
        } else {
          // Existing Kunfa user — add as active member
          await supabase.from('community_members').insert({
            community_id: community.id,
            user_id: existingByEmail.id,
            role: 'member',
            status: 'active',
            invited_by: profileId,
            invited_email: email,
          })
        }

        // Send notification email
        sendEmail({
          to: email,
          subject: `You've been invited to ${community.name} on Kunfa`,
          html: communityInviteEmailHtml(community.name, inviterName, true, slug),
        }).catch(() => {})

        invited++
      } else {
        // Not on Kunfa yet — check if we already have a pending invite
        const { data: pendingByEmail } = await supabase
          .from('community_members')
          .select('id')
          .eq('community_id', community.id)
          .eq('invited_email', email)
          .eq('status', 'pending')
          .maybeSingle()

        if (pendingByEmail) {
          alreadyMembers++
          continue
        }

        // Create a placeholder member with a temporary profile reference
        // We'll use invited_email to match when they sign up
        // For the user_id FK, we use the inviter as a placeholder and track via invited_email
        await supabase.from('community_members').insert({
          community_id: community.id,
          user_id: profileId, // placeholder — will be updated on signup
          role: 'member',
          status: 'pending',
          invited_by: profileId,
          invited_email: email,
        })

        // Send invite email
        sendEmail({
          to: email,
          subject: `You've been invited to ${community.name} on Kunfa`,
          html: communityInviteEmailHtml(community.name, inviterName, false, slug),
        }).catch(() => {})

        invited++
      }
    }

    return NextResponse.json({ invited, alreadyMembers })
  } catch (error) {
    console.error('[communities/invite] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
