import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
  typescript: true,
})

export async function createCheckoutSession(submissionId: string, baseUrl: string) {
  const priceId = process.env.STRIPE_PRICE_ID

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Kunfa Investment Memo',
              description: '15+ page AI-generated investment analysis with actionable recommendations',
            },
            unit_amount: 5900, // $59.00
          },
          quantity: 1,
        },
      ]

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${baseUrl}/report/${submissionId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/score/${submissionId}`,
    metadata: {
      submission_id: submissionId,
    },
  })

  return session
}
