import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { getTeamContext } from '@/lib/team-context'
import { requirePermission } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/my-company
 * Returns the company_pages record for the user's effective team context.
 * For team members, this returns the team owner's company instead of their own.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ company: null }, { status: 200 })
    }

    // Resolve team context — team members see the team owner's company
    const context = await getTeamContext(user.id)
    console.log('[MY-COMPANY] userId:', user.id, 'effectiveUserId:', context.effectiveUserId, 'isTeamMember:', context.isTeamMember)

    // Use service role to read the team owner's company (bypasses RLS for team members)
    const adminDb = getSupabase()
    const { data: company } = await adminDb
      .from('company_pages')
      .select('*')
      .eq('user_id', context.effectiveUserId)
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

    console.log(`[my-company] user=${user.id} submission=${company.submission_id || 'none'} paid=${paid} hasReport=${hasReport}`)

    return NextResponse.json({ company: safeCompany, paid, hasReport, hasPitchDeck, hasFinancials })
  } catch (error) {
    console.error('Error in GET /api/my-company:', error)
    return NextResponse.json({ company: null }, { status: 200 })
  }
}

/**
 * PATCH /api/my-company
 * Updates editable fields on the user's company page.
 * Uses team context so admin team members can also edit the team owner's company.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check: only owner/admin can edit
    let teamCtx
    try {
      teamCtx = await requirePermission(user.id, 'edit')
    } catch {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 })
    }

    const body = await request.json()
    const allowedFields = [
      'company_name', 'one_liner', 'industry', 'stage', 'country',
      'headquarters', 'website_url', 'raise_amount', 'team_size',
      'founded_year', 'use_of_funds', 'traction', 'linkedin_url',
      'company_linkedin_url', 'logo_url', 'founding_team',
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

    // Use effectiveUserId from team context (allows admin team members to edit)
    const adminDb = getSupabase()
    const { data: company, error } = await adminDb
      .from('company_pages')
      .update(updates)
      .eq('user_id', teamCtx.effectiveUserId)
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
