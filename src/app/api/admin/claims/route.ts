import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const statusFilter = request.nextUrl.searchParams.get('status')

    let query = supabase
      .from('claim_requests')
      .select(`
        id,
        company_id,
        requested_by,
        requester_email,
        requester_name,
        status,
        reviewed_by,
        reviewed_at,
        rejection_reason,
        created_at,
        company_pages!inner (
          company_name,
          website_url,
          slug
        )
      `)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: claims, error } = await query

    if (error) {
      console.error('Admin claims GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 })
    }

    return NextResponse.json({ claims })
  } catch (error) {
    console.error('Admin claims GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
