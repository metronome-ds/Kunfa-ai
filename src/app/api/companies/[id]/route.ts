import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const EDITABLE_FIELDS = [
  'company_name',
  'description',
  'one_liner',
  'industry',
  'stage',
  'country',
  'headquarters',
  'website_url',
  'linkedin_url',
  'raise_amount',
  'team_size',
  'founded_year',
  'founder_name',
  'founder_title',
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check ownership: added_by OR user_id must match
    const { data: company, error: fetchErr } = await supabase
      .from('company_pages')
      .select('id, added_by, user_id')
      .eq('id', id)
      .single()

    if (fetchErr || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.added_by !== user.id && company.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Only allow known fields
    const updates: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        const val = body[field]
        if (field === 'raise_amount') {
          updates[field] = val ? Number(val) : null
        } else if (field === 'team_size' || field === 'founded_year') {
          updates[field] = val ? Number(val) : null
        } else {
          updates[field] = val || null
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateErr } = await supabase
      .from('company_pages')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (updateErr) {
      console.error('Failed to update company:', updateErr)
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Companies PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
