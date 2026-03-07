import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { markSubmissionPaid } from '@/lib/db'

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { id: string; metadata: { submission_id?: string } }
    const submissionId = session.metadata?.submission_id

    if (!submissionId) {
      console.error('Webhook: checkout.session.completed missing submission_id in metadata')
      return NextResponse.json({ error: 'Missing submission_id' }, { status: 400 })
    }

    try {
      await markSubmissionPaid(submissionId, session.id)
      console.log(`Webhook: marked submission ${submissionId} as paid`)
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
