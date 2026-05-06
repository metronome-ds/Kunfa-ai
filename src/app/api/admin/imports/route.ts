import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    // Fetch stats
    const { data: allRecords } = await supabase
      .from('company_imports')
      .select('status')

    const stats = { total: 0, raw: 0, cleaned: 0, promoted: 0, rejected: 0, duplicate: 0 }
    if (allRecords) {
      stats.total = allRecords.length
      for (const r of allRecords) {
        if (r.status in stats) {
          stats[r.status as keyof typeof stats]++
        }
      }
    }

    // Fetch records for requested status
    let query = supabase
      .from('company_imports')
      .select('id, raw_name, clean_name, raw_source, status, raw_country, clean_country, raw_sector, clean_sector, batch_id, rejection_reason, imported_at')
      .order('imported_at', { ascending: false })
      .limit(100)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: records, error: fetchError } = await query

    if (fetchError) {
      console.error('[IMPORTS] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    return NextResponse.json({ stats, records: records || [] })
  } catch (error) {
    console.error('[IMPORTS] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
