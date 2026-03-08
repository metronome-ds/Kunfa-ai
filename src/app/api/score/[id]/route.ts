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
      console.error(`GET /api/score/${id}: submission not found`, error?.message)
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
        const analysis = submission.full_analysis as Record<string, unknown>

        // Normalize old dimensions-based format to flat format if needed
        let normalized = analysis
        if (typeof analysis.team_score !== 'number' && analysis.dimensions && typeof analysis.dimensions === 'object') {
          const dims = analysis.dimensions as Record<string, Record<string, unknown>>
          normalized = {
            ...analysis,
            team_score: dims.team?.score || 0,
            team_grade: dims.team?.letter_grade || 'N/A',
            team_summary: dims.team?.headline || '',
            market_score: dims.market?.score || 0,
            market_grade: dims.market?.letter_grade || 'N/A',
            market_summary: dims.market?.headline || '',
            product_score: dims.product?.score || 0,
            product_grade: dims.product?.letter_grade || 'N/A',
            product_summary: dims.product?.headline || '',
            financial_score: dims.financial?.score || 0,
            financial_grade: dims.financial?.letter_grade || 'N/A',
            financial_summary: dims.financial?.headline || '',
            description: analysis.summary || analysis.description || '',
          }
        }

        teaser = extractTeaser(normalized as unknown as ScoringResult)
      } catch {
        // Fall back to manual construction
      }
    }

    if (!teaser) {
      const score = submission.overall_score || 0
      teaser = {
        overall_score: score,
        percentile: Math.min(99, Math.max(1, score)),
        summary: '',
        investment_readiness: score >= 80 ? 'Strong' : score >= 65 ? 'Almost Ready' : score >= 50 ? 'Needs Work' : 'Early Stage',
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
