import { NextRequest, NextResponse } from 'next/server'
import { getSubmission, updateReportUrl, getSupabase } from '@/lib/db'
import { generateReport } from '@/lib/pdf'
import { uploadFile } from '@/lib/upload'
import { generateExpandedMemo } from '@/lib/anthropic'
import type { ScoringResult } from '@/lib/anthropic'

export const maxDuration = 300

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const submission = await getSubmission(id)

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Allow test bypass with secret key
    const bypassKey = request.nextUrl.searchParams.get('key')
    const isTestBypass = bypassKey != null && bypassKey === process.env.TEST_BYPASS_KEY

    if (!submission.paid && !isTestBypass) {
      return NextResponse.json({ error: 'Payment required' }, { status: 403 })
    }

    // If report already generated, fetch and stream it (don't expose raw blob URL)
    if (submission.report_url) {
      try {
        const blobRes = await fetch(submission.report_url)
        if (blobRes.ok && blobRes.body) {
          return new NextResponse(blobRes.body, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="kunfa-readiness-report-${id}.pdf"`,
              'Cache-Control': 'private, no-store',
            },
          })
        }
      } catch {
        // Fall through to regenerate if fetch fails
      }
    }

    // Generate PDF
    if (!submission.full_analysis) {
      return NextResponse.json({ error: 'No analysis data available' }, { status: 500 })
    }

    // Validate and normalize analysis to flat format
    const rawAnalysis = submission.full_analysis as Record<string, unknown>
    if (typeof rawAnalysis.overall_score !== 'number') {
      console.error('Malformed full_analysis for submission', id, JSON.stringify(rawAnalysis).slice(0, 500))
      return NextResponse.json({ error: 'Analysis data is incomplete — please re-score' }, { status: 500 })
    }

    // Normalize: convert old dimensions-based format to flat format if needed
    let analysis = rawAnalysis
    if (typeof rawAnalysis.team_score !== 'number' && rawAnalysis.dimensions && typeof rawAnalysis.dimensions === 'object') {
      const dims = rawAnalysis.dimensions as Record<string, Record<string, unknown>>
      analysis = {
        ...rawAnalysis,
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
        description: rawAnalysis.summary || rawAnalysis.description || '',
        stage_weights_applied: 'legacy',
        financials_analyzed: false,
      }
    }

    // Generate expanded Investment Memorandum content via second Claude call
    console.log(`[Report ${id}] Generating expanded memo content...`)
    const memoContent = await generateExpandedMemo(
      analysis as unknown as ScoringResult
    )
    console.log(`[Report ${id}] Expanded memo generated, building PDF...`)

    const pdfBuffer = await generateReport(
      analysis as unknown as ScoringResult,
      memoContent,
      submission.email
    )
    console.log(`[Report ${id}] PDF generated (${pdfBuffer.length} bytes)`)

    // Upload PDF to Vercel Blob
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' })
    const reportUrl = await uploadFile(
      pdfBlob,
      `reports/${id}/kunfa-investment-memo.pdf`
    )

    // Save URL to database
    await updateReportUrl(id, reportUrl)

    // Insert notification for the user
    if (submission.user_id) {
      const supabase = getSupabase()
      await supabase.from('notifications').insert({
        user_id: submission.user_id,
        title: 'Your Kunfa Readiness Report is ready',
        body: 'View your full AI-powered investment analysis.',
        type: 'report_ready',
        link: `/report/${id}`,
        read: false,
      }).then(({ error }) => {
        if (error) console.error('Failed to insert report notification:', error)
      })
    }

    // Return PDF directly
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="kunfa-investment-memo-${id}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: `Failed to generate report: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
