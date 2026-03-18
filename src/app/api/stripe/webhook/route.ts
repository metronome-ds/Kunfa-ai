import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { markSubmissionPaid, getSubmission, getSupabase } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { paymentConfirmationEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  console.log(`Stripe webhook received: ${event.type}`)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { id: string; metadata: Record<string, string> | null; customer_email?: string; amount_total?: number }
    console.log('Webhook session:', JSON.stringify({
      sessionId: session.id,
      metadata: session.metadata,
      email: session.customer_email,
      amount: session.amount_total,
    }))

    const submissionId = session.metadata?.submission_id

    if (!submissionId) {
      console.error('Webhook: checkout.session.completed missing submission_id in metadata. Full metadata:', JSON.stringify(session.metadata))
      return NextResponse.json({ error: 'Missing submission_id' }, { status: 400 })
    }

    try {
      await markSubmissionPaid(submissionId, session.id)
      console.log(`Webhook: marked submission ${submissionId} as paid`)

      // Send payment confirmation email (don't block webhook response)
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
        sendEmail({ to: submission.email, ...emailContent }).catch(() => {})
      }
    } catch (dbErr) {
      console.error(`Webhook: failed to mark submission ${submissionId} as paid:`, dbErr)
      // Return 500 so Stripe will retry the webhook
      return NextResponse.json(
        { error: 'Database error — will retry' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}
