import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getTeamContext, getAvailableTeams } from '@/lib/team-context'

/**
 * GET /api/team-context
 * Returns the current user's effective team context and the list of teams
 * they can switch to.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [context, availableTeams] = await Promise.all([
      getTeamContext(user.id),
      getAvailableTeams(user.id),
    ])

    return NextResponse.json({ context, availableTeams })
  } catch (error) {
    console.error('[team-context] Error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Failed to load team context' }, { status: 500 })
  }
}
