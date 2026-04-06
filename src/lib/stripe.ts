import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
  typescript: true,
})

// The Stripe product for the Kunfa Investment Memo ($59 one-time).
// Using price_data with the product ID avoids test/live price ID mismatches.
const STRIPE_PRODUCT_ID = process.env.STRIPE_PRODUCT_ID || 'prod_Tx6voM6LEeuBlX'
const MEMO_PRICE_CENTS = 5900 // $59.00

export async function createCheckoutSession(
  submissionId: string,
  baseUrl: string,
  successPath?: string,
  cancelPath?: string,
) {
  const priceId = process.env.STRIPE_PRICE_ID

  // If a specific price ID is configured, use it. Otherwise, create an
  // inline price from the product ID — this works in both test and live
  // mode without needing to keep price IDs in sync.
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: 'usd',
            product: STRIPE_PRODUCT_ID,
            unit_amount: MEMO_PRICE_CENTS,
          },
          quantity: 1,
        },
      ]

  console.log('[STRIPE] Creating checkout session:', {
    submissionId,
    priceId: priceId || '(inline price_data)',
    productId: priceId ? '(from price)' : STRIPE_PRODUCT_ID,
    amount: priceId ? '(from price)' : `$${(MEMO_PRICE_CENTS / 100).toFixed(2)}`,
    successUrl: successPath ? `${baseUrl}${successPath}` : `${baseUrl}/report/${submissionId}`,
    cancelUrl: cancelPath ? `${baseUrl}${cancelPath}` : `${baseUrl}/score/${submissionId}`,
  })

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: successPath
      ? `${baseUrl}${successPath}`
      : `${baseUrl}/report/${submissionId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelPath
      ? `${baseUrl}${cancelPath}`
      : `${baseUrl}/score/${submissionId}`,
    metadata: {
      submission_id: submissionId,
    },
  })

  return session
}
