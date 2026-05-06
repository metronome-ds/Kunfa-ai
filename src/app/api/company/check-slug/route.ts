import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Rate limit: 10 requests per minute per IP
const slugRateMap = new Map<string, { count: number; windowStart: number }>()
const SLUG_LIMIT = 10
const SLUG_WINDOW_MS = 60 * 1000 // 1 minute

function checkSlugRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = slugRateMap.get(ip)
  if (!entry || now - entry.windowStart > SLUG_WINDOW_MS) {
    slugRateMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= SLUG_LIMIT) return false
  entry.count++
  return true
}

/**
 * GET /api/company/check-slug?slug=xxx
 * Check if a company slug is available.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkSlugRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
  }

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
