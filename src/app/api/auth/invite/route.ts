import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'

/**
 * GET /api/auth/invite?id=[entity_member_id]
 * Look up invite details for pre-filling signup form.
 * Public endpoint (no auth required).
 * Returns the entity type so the new member gets the appropriate role.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing invite id' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Look up from entity_members (sole source of truth)
  const { data: invite } = await supabase
    .from('entity_members')
    .select('id, entity_id, invited_email, invited_name, role, status')
    .eq('id', id)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.status === 'active') {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 })
  }

  // Look up the entity to derive the user role
  const { data: entity } = await supabase
    .from('entities')
    .select('name, type')
    .eq('id', invite.entity_id)
    .single()

  const entityType = entity?.type || 'fund'
  const isFund = entityType === 'fund' || entityType === 'vc' || entityType === 'investor'
  const teamOwnerRole = isFund ? 'investor' : 'startup'
  const teamOwnerName = entity?.name || null
  const fundName = isFund ? entity?.name || null : null

  // Check if a Supabase auth user already exists with this email.
  let existingUser = false
  if (invite.invited_email) {
    try {
      const { data: users } = await supabase.auth.admin.listUsers()
      existingUser = !!users?.users?.find((u) => u.email === invite.invited_email)
    } catch (err) {
      console.error('[invite] Failed to check existing user:', err)
    }
  }

  return NextResponse.json({
    email: invite.invited_email,
    name: invite.invited_name,
    role: invite.role,
    teamOwnerRole,
    teamOwnerName,
    fundName,
    existingUser,
  })
}
