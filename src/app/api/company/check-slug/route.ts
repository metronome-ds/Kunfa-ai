import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/company/check-slug?slug=xxx
 * Check if a company slug is available.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  // Validate format: 3-40 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphens
  if (!/^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$/.test(slug)) {
    return NextResponse.json({ available: false, reason: 'invalid' })
  }

  const supabase = getSupabase()
  const { data } = await supabase
    .from('company_pages')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return NextResponse.json({ available: !data })
}
