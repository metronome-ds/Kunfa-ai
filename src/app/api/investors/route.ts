import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''

    const supabase = getSupabase()

    let dbQuery = supabase
      .from('profiles')
      .select('user_id, full_name, email, fund_name')
      .eq('role', 'investor')
      .neq('user_id', user.id)
      .order('full_name', { ascending: true })
      .limit(20)

    if (query.length >= 2) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,fund_name.ilike.%${query}%`)
    }

    const { data: investors, error: dbError } = await dbQuery

    if (dbError) {
      console.error('[investors] Query failed:', dbError.message)
      return NextResponse.json({ error: 'Failed to fetch investors' }, { status: 500 })
    }

    return NextResponse.json({
      investors: (investors || []).map((p) => ({
        userId: p.user_id,
        name: p.full_name,
        email: p.email,
        fundName: p.fund_name,
      })),
    })
  } catch (error) {
    console.error('[investors] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
