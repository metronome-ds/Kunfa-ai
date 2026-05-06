import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
  typescript: true,
})

export async function createCheckoutSession(
  submissionId: string,
  baseUrl: string,
  successPath?: string,
  cancelPath?: string,
) {
  const successUrl = successPath
    ? `${baseUrl}${successPath}`
    : `${baseUrl}/report/${submissionId}?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = cancelPath
    ? `${baseUrl}${cancelPath}`
    : `${baseUrl}/score/${submissionId}`

  console.log('[STRIPE] Creating checkout session:', {
    submissionId,
    successUrl,
    cancelUrl,
  })

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Kunfa Investment Memo',
            description:
              'AI-powered investment readiness report with detailed scoring across 6 dimensions, sector benchmarks, and actionable recommendations.',
          },
          unit_amount: 5900, // $59.00
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      submission_id: submissionId,
    },
  })

  return session
}
