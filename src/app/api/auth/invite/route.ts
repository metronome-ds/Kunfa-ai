import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'

/**
 * GET /api/auth/invite?id=[team_member_id]
 * Look up invite details for pre-filling signup form.
 * Public endpoint (no auth required).
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing invite id' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data: invite } = await supabase
    .from('team_members')
    .select('id, invited_email, invited_name, role, status')
    .eq('id', id)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 })
  }

  return NextResponse.json({
    email: invite.invited_email,
    name: invite.invited_name,
    role: invite.role,
  })
}
