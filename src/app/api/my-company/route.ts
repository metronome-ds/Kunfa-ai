import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

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
    let paid = false
    let reportUrl: string | null = null
    if (company.submission_id) {
      const { data: submission } = await supabase
        .from('submissions')
        .select('paid, report_url, created_at')
        .eq('id', company.submission_id)
        .single()

      if (submission) {
        paid = !!submission.paid
        reportUrl = submission.report_url || null
      }
    }

    return NextResponse.json({ company, paid, reportUrl })
  } catch (error) {
    console.error('Error in GET /api/my-company:', error)
    return NextResponse.json({ company: null }, { status: 200 })
  }
}
