import { NextRequest, NextResponse } from 'next/server'
import { getSubmission, updateReportUrl } from '@/lib/db'
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

    // If report already generated, redirect to it
    if (submission.report_url) {
      return NextResponse.redirect(submission.report_url)
    }

    // Generate PDF
    if (!submission.full_analysis) {
      return NextResponse.json({ error: 'No analysis data available' }, { status: 500 })
    }

    // Validate analysis has required structure
    const analysis = submission.full_analysis as Record<string, unknown>
    if (
      typeof analysis.overall_score !== 'number' ||
      !analysis.dimensions ||
      typeof analysis.dimensions !== 'object'
    ) {
      console.error('Malformed full_analysis for submission', id, JSON.stringify(analysis).slice(0, 500))
      return NextResponse.json({ error: 'Analysis data is incomplete — please re-score' }, { status: 500 })
    }

    const dims = analysis.dimensions as Record<string, unknown>
    for (const key of ['team', 'market', 'product', 'financial']) {
      if (!dims[key] || typeof dims[key] !== 'object') {
        console.error(`Missing dimension "${key}" in full_analysis for submission`, id)
        return NextResponse.json({ error: `Analysis data missing ${key} dimension — please re-score` }, { status: 500 })
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
