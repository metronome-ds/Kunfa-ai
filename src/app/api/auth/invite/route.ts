import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'

/**
 * GET /api/auth/invite?id=[team_member_id]
 * Look up invite details for pre-filling signup form.
 * Public endpoint (no auth required).
 * Returns the team owner's user role so the new member inherits it.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing invite id' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data: invite } = await supabase
    .from('team_members')
    .select('id, team_id, invited_email, invited_name, role, status')
    .eq('id', id)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 })
  }

  // Look up the team owner's profile to inherit their user role
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('role, full_name, fund_name, company_name')
    .eq('id', invite.team_id)
    .single()

  const teamOwnerRole = ownerProfile?.role || 'investor'
  const teamOwnerName = ownerProfile?.full_name || null
  const fundName = ownerProfile?.fund_name || ownerProfile?.company_name || null

  return NextResponse.json({
    email: invite.invited_email,
    name: invite.invited_name,
    role: invite.role, // team role (admin/member/viewer)
    teamOwnerRole, // user role (startup/investor/etc) — new member inherits this
    teamOwnerName,
    fundName,
  })
}
