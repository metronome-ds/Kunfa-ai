import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * GET /api/my-company
 * Returns { slug } for the current user's most recent company page.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ slug: null }, { status: 200 })
    }

    const { data } = await supabase
      .from('company_pages')
      .select('slug')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ slug: data?.slug || null })
  } catch (error) {
    console.error('Error in GET /api/my-company:', error)
    return NextResponse.json({ slug: null }, { status: 200 })
  }
}
