import { getSupabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { extractTeaser, type ScoringResult } from '@/lib/anthropic'

/**
 * GET /api/score/[id]
 * Returns teaser score data for a submission by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('id, overall_score, team_score, team_grade, market_score, market_grade, product_score, product_grade, financial_score, financial_grade, full_analysis')
      .eq('id', id)
      .single()

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Get company slug
    const { data: company } = await supabase
      .from('company_pages')
      .select('slug, company_name')
      .eq('submission_id', id)
      .maybeSingle()

    // Try to extract teaser from full_analysis, otherwise build manually
    let teaser
    if (submission.full_analysis) {
      try {
        teaser = extractTeaser(submission.full_analysis as ScoringResult)
      } catch {
        // Fall back to manual construction
      }
    }

    if (!teaser) {
      teaser = {
        overall_score: submission.overall_score || 0,
        percentile: Math.min(99, Math.max(1, Math.round((submission.overall_score || 0) * 0.9))),
        summary: '',
        investment_readiness: (submission.overall_score || 0) >= 70 ? 'Ready' : (submission.overall_score || 0) >= 50 ? 'Almost Ready' : 'Needs Work',
        dimensions: {
          team: { score: submission.team_score || 0, letter_grade: submission.team_grade || 'N/A', headline: '' },
          market: { score: submission.market_score || 0, letter_grade: submission.market_grade || 'N/A', headline: '' },
          product: { score: submission.product_score || 0, letter_grade: submission.product_grade || 'N/A', headline: '' },
          financial: { score: submission.financial_score || 0, letter_grade: submission.financial_grade || 'N/A', headline: '' },
        },
      }
    }

    return NextResponse.json({
      teaser,
      slug: company?.slug || null,
      companyName: company?.company_name || null,
    })
  } catch (error) {
    console.error('Error in GET /api/score/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
