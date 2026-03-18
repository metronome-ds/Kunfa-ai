import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/my-company
 * Returns the current user's most recent company_pages record (full data).
 * Also returns submission payment status if a submission exists.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ company: null }, { status: 200 })
    }

    const { data: company } = await supabase
      .from('company_pages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!company) {
      return NextResponse.json({ company: null })
    }

    // Check submission payment status if submission exists
    // Use service role client to bypass RLS on submissions table
    let paid = false
    let hasReport = false
    if (company.submission_id) {
      const adminDb = getSupabase()
      const { data: submission, error: subError } = await adminDb
        .from('submissions')
        .select('paid, report_url, created_at')
        .eq('id', company.submission_id)
        .single()

      if (subError) {
        console.error('my-company: failed to fetch submission', company.submission_id, subError.message)
      }
      if (submission) {
        paid = !!submission.paid
        hasReport = !!submission.report_url
      }
    }

    // Strip raw blob URLs from client response — use /api/documents/[id] proxy instead
    const { pdf_url, financials_url, ...safeCompany } = company
    const hasPitchDeck = !!(pdf_url || company.submission_id)
    const hasFinancials = !!financials_url

    return NextResponse.json({ company: safeCompany, paid, hasReport, hasPitchDeck, hasFinancials })
  } catch (error) {
    console.error('Error in GET /api/my-company:', error)
    return NextResponse.json({ company: null }, { status: 200 })
  }
}

/**
 * PATCH /api/my-company
 * Updates editable fields on the user's company page.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const allowedFields = [
      'company_name', 'one_liner', 'industry', 'stage', 'country',
      'headquarters', 'website_url', 'raise_amount', 'team_size',
      'founded_year', 'use_of_funds', 'traction', 'linkedin_url',
      'company_linkedin_url', 'founding_team',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: company, error } = await supabase
      .from('company_pages')
      .update(updates)
      .eq('user_id', user.id)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Error in PATCH /api/my-company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
