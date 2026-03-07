import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSubmission, markSubmissionPaid, isDatabaseConfigured } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, submissionId } = await request.json()

    if (!sessionId || !submissionId) {
      return NextResponse.json(
        { error: 'Missing sessionId or submissionId' },
        { status: 400 }
      )
    }

    // Verify the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', paymentStatus: session.payment_status },
        { status: 402 }
      )
    }

    // Verify the session belongs to this submission
    if (session.metadata?.submission_id !== submissionId) {
      return NextResponse.json(
        { error: 'Session does not match submission' },
        { status: 403 }
      )
    }

    // Mark as paid in database
    let submission = null
    if (isDatabaseConfigured()) {
      try {
        await markSubmissionPaid(submissionId, sessionId)
        submission = await getSubmission(submissionId)
      } catch (dbErr) {
        console.error('DB error during payment verification:', dbErr)
      }
    }

    // Return score summary if available
    const scoreSummary = submission?.full_analysis
      ? {
          overall_score: (submission.full_analysis as Record<string, unknown>).overall_score,
          percentile: (submission.full_analysis as Record<string, unknown>).percentile,
          investment_readiness: (submission.full_analysis as Record<string, unknown>).investment_readiness,
        }
      : null

    return NextResponse.json({
      verified: true,
      paid: true,
      submissionId,
      scoreSummary,
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
