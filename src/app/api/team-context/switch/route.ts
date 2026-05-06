import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getTeamContext, switchTeamContext } from '@/lib/team-context'

/**
 * POST /api/team-context/switch
 * Body: { teamId: string | null }
 *   - teamId = null → switch to own data
 *   - teamId set    → switch to that team (must be a member)
 * Returns the new context.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const teamId = body?.teamId === null ? null : (typeof body?.teamId === 'string' ? body.teamId : undefined)

    if (teamId === undefined) {
      return NextResponse.json({ error: 'teamId is required (string or null)' }, { status: 400 })
    }

    try {
      await switchTeamContext(user.id, teamId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch team'
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const context = await getTeamContext(user.id)
    return NextResponse.json({ context })
  } catch (error) {
    console.error('[team-context/switch] Error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Failed to switch team context' }, { status: 500 })
  }
}
