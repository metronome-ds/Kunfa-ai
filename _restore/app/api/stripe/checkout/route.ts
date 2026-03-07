import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Missing submissionId' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    const session = await createCheckoutSession(submissionId, baseUrl)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
