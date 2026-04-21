import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { teamInviteEmail } from '@/lib/email-templates'
import { requirePermission } from '@/lib/permissions'
import { getEntityMembers, inviteToEntity } from '@/lib/entity-context'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormattedMember {
  id: string
  name: string
  email: string
  role: string
  status: string
  member_user_id: string | null
  created_at: string | null
  title: string | null
  source: 'entity' | 'team'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the caller's profile and active entity.
 * Entity is the SOLE source of truth for team membership. Falls back to no
 * entity only if the user genuinely has no entity_members rows.
 */
async function resolveEntityContext(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  authUserId: string,
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, fund_name, company_name, active_entity_id')
    .eq('user_id', authUserId)
    .single()

  if (!profile) return { profile: null, entityId: null }

  const db = getSupabase()
  let entityId = profile.active_entity_id || null

  // If active_entity_id is set, verify membership
  if (entityId) {
    const { data: mem } = await db
      .from('entity_members')
      .select('role')
      .eq('entity_id', entityId)
      .eq('user_id', profile.id)
      .in('status', ['active', 'pending'])
      .maybeSingle()

    if (!mem) entityId = null // stale — clear it
  }

  // If no active entity, try to auto-resolve from entity_members
  if (!entityId) {
    const { data: firstMem } = await db
      .from('entity_members')
      .select('entity_id')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstMem) {
      entityId = firstMem.entity_id
      // Persist so future calls resolve instantly
      await db.from('profiles').update({ active_entity_id: entityId }).eq('id', profile.id)
    }
  }

  return { profile, entityId }
}

// ---------------------------------------------------------------------------
// GET /api/team — list members (entity or legacy team)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { profile, entityId } = await resolveEntityContext(supabase, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ── Entity mode ──────────────────────────────────────────────────────
    if (entityId) {
      const raw = await getEntityMembers(entityId)

      // Determine the current user's role in the entity (for canManage)
      const db = getSupabase()
      const { data: selfMem } = await db
        .from('entity_members')
        .select('role')
        .eq('entity_id', entityId)
        .eq('user_id', profile.id)
        .in('status', ['active'])
        .maybeSingle()

      const selfRole = selfMem?.role || 'member'

      type RawMember = (typeof raw)[number]

      const formatted: FormattedMember[] = raw
        .filter((m: RawMember) => m.status !== 'removed')
        .map((m: RawMember) => {
          const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
          const isOwner = m.role === 'owner' && m.user_id === profile.id
          return {
            id: m.id,
            name: p?.full_name || m.invited_name || 'Pending',
            email: p?.email || m.invited_email || '',
            role: m.role,
            status: m.status === 'active' ? 'accepted' : m.status,
            member_user_id: p?.id || null,
            created_at: m.joined_at || null,
            title: m.title || null,
            source: 'entity' as const,
            _isCurrentUser: isOwner,
          }
        })

      // Sort: owners first, then admin, then others
      const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2, observer: 3 }
      formatted.sort(
        (a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99),
      )

      return NextResponse.json({
        data: formatted,
        entityMode: true,
        entityId,
        selfRole,
      })
    }

    // ── Legacy team_members mode ─────────────────────────────────────────
    const teamId = profile.id

    const { data: members, error } = await supabase
      .from('team_members')
      .select('id, member_user_id, invited_email, invited_name, role, status, created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    const acceptedUserIds = (members || [])
      .filter((m) => m.member_user_id)
      .map((m) => m.member_user_id)

    let profileMap: Record<string, { full_name: string; email: string }> = {}
    if (acceptedUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', acceptedUserIds)

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.user_id] = { full_name: p.full_name || '', email: p.email || '' }
        }
      }
    }

    const formatted: FormattedMember[] = (members || []).map((m) => ({
      id: m.id,
      name:
        m.member_user_id && profileMap[m.member_user_id]?.full_name
          ? profileMap[m.member_user_id].full_name
          : m.invited_name || '',
      email:
        m.member_user_id && profileMap[m.member_user_id]?.email
          ? profileMap[m.member_user_id].email
          : m.invited_email,
      role: m.role,
      status: m.status,
      member_user_id: m.member_user_id,
      created_at: m.created_at,
      title: null,
      source: 'team' as const,
    }))

    const result = [
      {
        id: 'owner',
        name: profile.full_name || 'You',
        email: profile.email || user.email || '',
        role: 'owner',
        status: 'accepted',
        member_user_id: user.id,
        created_at: null,
        title: null,
        source: 'team' as const,
      },
      ...formatted,
    ]

    return NextResponse.json({ data: result, entityMode: false })
  } catch (error) {
    console.error('Unexpected error in GET /api/team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/team — invite member (entity or legacy team)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, role } = body

    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const { profile, entityId } = await resolveEntityContext(supabase, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ── Entity mode ──────────────────────────────────────────────────────
    if (entityId) {
      const validRoles = ['admin', 'member', 'observer']
      if (!validRoles.includes(role || '')) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
          { status: 400 },
        )
      }

      // Permission: only owner/admin can invite
      const db = getSupabase()
      const { data: selfMem } = await db
        .from('entity_members')
        .select('role')
        .eq('entity_id', entityId)
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()

      if (selfMem?.role !== 'owner' && selfMem?.role !== 'admin') {
        return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 })
      }

      // Check if already an active/pending member by email
      const { data: existing } = await db
        .from('entity_members')
        .select('id, status')
        .eq('entity_id', entityId)
        .eq('invited_email', email.toLowerCase())
        .in('status', ['active', 'pending'])
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'This email already has a membership in this entity' },
          { status: 409 },
        )
      }

      const result = await inviteToEntity(entityId, email, role || 'member', profile.id, name)

      // Send invitation email for pending invites (AWAITED)
      if (result.status === 'pending') {
        const inviterName = profile.full_name || 'A team member'
        // Use entity name for emails, not stale profile.fund_name
        const { data: entityRow } = await db.from('entities').select('name').eq('id', entityId).single()
        const teamName = entityRow?.name || profile.fund_name || profile.company_name || 'their team'
        console.log(`[Entity Invite] Sending invite email to ${email} from ${inviterName} (${teamName})`)
        const emailContent = teamInviteEmail({
          inviterName,
          teamName,
          role: role || 'member',
          teamMemberId: result.id,
        })
        await sendEmail({ to: email, ...emailContent })
      }

      return NextResponse.json(
        {
          data: { id: result.id, status: result.status },
          message:
            result.status === 'active'
              ? `${name} already has an account and has been added`
              : `Invitation sent to ${email}`,
        },
        { status: 201 },
      )
    }

    // ── Legacy team_members mode ─────────────────────────────────────────
    let teamCtx
    try {
      teamCtx = await requirePermission(user.id, 'manage_team')
    } catch {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 })
    }

    if (!['admin', 'member', 'viewer'].includes(role || '')) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 },
      )
    }

    const { data: effectiveProfile } = await supabase
      .from('profiles')
      .select('id, full_name, fund_name, company_name')
      .eq('user_id', teamCtx.effectiveUserId)
      .single()

    if (!effectiveProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', effectiveProfile.id)
      .eq('invited_email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'This email has already been invited to your team' },
        { status: 409 },
      )
    }

    const { data: existingProfileByEmail } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle()

    const { data: member, error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: effectiveProfile.id,
        invited_email: email,
        invited_name: name,
        role: role || 'member',
        status: existingProfileByEmail ? 'accepted' : 'pending',
        member_user_id: existingProfileByEmail?.user_id || null,
        invited_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inviting team member:', insertError)
      return NextResponse.json({ error: 'Failed to invite team member' }, { status: 500 })
    }

    if (member.status === 'pending') {
      const inviterName = effectiveProfile.full_name || 'A team member'
      const teamName = effectiveProfile.fund_name || effectiveProfile.company_name || 'their team'
      const emailContent = teamInviteEmail({
        inviterName,
        teamName,
        role: role || 'member',
        teamMemberId: member.id,
      })
      // AWAITED — don't fire-and-forget
      await sendEmail({ to: email, ...emailContent })
    }

    return NextResponse.json(
      { data: member, message: `Invitation sent to ${email}` },
      { status: 201 },
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
