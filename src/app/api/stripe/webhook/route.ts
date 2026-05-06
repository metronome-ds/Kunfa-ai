import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { markSubmissionPaid, getSubmission, getSupabase } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { paymentConfirmationEmail } from '@/lib/email-templates'

export async function GET() {
  return NextResponse.json({ status: 'webhook endpoint active' })
}

export async function POST(request: NextRequest) {
  // Verify required env vars
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Webhook: STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Webhook: SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('Webhook: missing stripe-signature header')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    console.error('Webhook: signature verification FAILED:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  console.log(`[Stripe Webhook] Event received: ${event.type}, id: ${event.id}`)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const s = session as unknown as Record<string, unknown>
    const metadata = s.metadata as Record<string, string> | null
    const sessionId = s.id as string
    const customerEmail = s.customer_email as string | undefined
    const amountTotal = s.amount_total as number | undefined

    console.log('[Stripe Webhook] checkout.session.completed:', JSON.stringify({
      sessionId,
      metadata,
      customerEmail,
      amountTotal,
    }))

    const submissionId = metadata?.submission_id

    if (!submissionId) {
      console.error('[Stripe Webhook] MISSING submission_id in metadata. Full metadata:', JSON.stringify(metadata))
      return NextResponse.json({ error: 'Missing submission_id' }, { status: 400 })
    }

    console.log(`[Stripe Webhook] Processing payment for submission: ${submissionId}`)

    try {
      await markSubmissionPaid(submissionId, sessionId)
      console.log(`[Stripe Webhook] SUCCESS: marked submission ${submissionId} as paid`)
    } catch (dbErr) {
      console.error(`[Stripe Webhook] FAILED to mark submission ${submissionId} as paid:`, dbErr instanceof Error ? dbErr.message : dbErr)
      return NextResponse.json(
        { error: 'Database error — will retry' },
        { status: 500 }
      )
    }

    // Send payment confirmation email
    try {
      const submission = await getSubmission(submissionId)
      if (submission?.email) {
        const supabase = getSupabase()
        const { data: company } = await supabase
          .from('company_pages')
          .select('slug')
          .eq('submission_id', submissionId)
          .maybeSingle()

        const emailContent = paymentConfirmationEmail({
          companyName: submission.company_name || 'your company',
          slug: company?.slug || null,
        })
        const sent = await sendEmail({ to: submission.email, ...emailContent })
        console.log(`[Stripe Webhook] Payment confirmation email ${sent ? 'sent' : 'FAILED'} to ${submission.email}`)
      } else {
        console.warn(`[Stripe Webhook] No email found for submission ${submissionId}`)
      }
    } catch (emailErr) {
      console.error(`[Stripe Webhook] Email send error:`, emailErr instanceof Error ? emailErr.message : emailErr)
      // Don't fail the webhook for email errors
    }
  }

  return NextResponse.json({ received: true })
}
