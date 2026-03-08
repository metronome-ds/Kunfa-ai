import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { getSupabase } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Missing submissionId' },
        { status: 400 }
      )
    }

    // Look up company slug for post-payment redirect
    const supabase = getSupabase()
    const { data: company } = await supabase
      .from('company_pages')
      .select('slug')
      .eq('submission_id', submissionId)
      .maybeSingle()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    const successPath = company?.slug
      ? `/company/${company.slug}?paid=true`
      : `/report/${submissionId}?session_id={CHECKOUT_SESSION_ID}`

    const session = await createCheckoutSession(submissionId, baseUrl, successPath)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
