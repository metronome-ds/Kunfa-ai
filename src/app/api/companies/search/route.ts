import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/companies/search?q=name — search companies by name
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = request.nextUrl.searchParams.get('q')
    if (!q || q.length < 2) return NextResponse.json({ companies: [] })

    const supabase = getServiceClient()
    const { data: companies } = await supabase
      .from('company_pages')
      .select('id, company_name, slug, ai_score')
      .ilike('company_name', `%${q}%`)
      .limit(10)

    return NextResponse.json({ companies: companies || [] })
  } catch (error) {
    console.error('[companies/search] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
