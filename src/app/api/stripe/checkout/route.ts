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

    // --- Debug: log Stripe config on every call so Vercel logs capture it ---
    console.log('[STRIPE CHECKOUT] Key prefix:', process.env.STRIPE_SECRET_KEY?.substring(0, 8) || 'MISSING')
    console.log('[STRIPE CHECKOUT] Price ID env:', process.env.STRIPE_PRICE_ID || '(not set — using inline price_data)')

    // Look up company slug for post-payment redirect
    const supabase = getSupabase()
    const { data: company } = await supabase
      .from('company_pages')
      .select('slug')
      .eq('submission_id', submissionId)
      .maybeSingle()

    const baseUrl = 'https://www.kunfa.ai'
    const successPath = company?.slug
      ? `/company/${company.slug}?paid=true&sid=${submissionId}`
      : `/dashboard?paid=true&sid=${submissionId}`

    // Temporary bypass: skip Stripe, mark paid immediately
    if (process.env.STRIPE_BYPASS === 'true') {
      await supabase
        .from('submissions')
        .update({ paid: true })
        .eq('id', submissionId)

      return NextResponse.json({ url: `${baseUrl}${successPath}` })
    }

    const cancelPath = `/score/${submissionId}`
    console.log('[STRIPE CHECKOUT] Creating session for submission:', submissionId)
    const session = await createCheckoutSession(submissionId, baseUrl, successPath, cancelPath)

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const err = error as { message?: string; type?: string; statusCode?: number; code?: string; raw?: unknown }
    console.error('[STRIPE CHECKOUT] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2))
    console.error('[STRIPE CHECKOUT] Error message:', err.message)
    console.error('[STRIPE CHECKOUT] Error type:', err.type)
    console.error('[STRIPE CHECKOUT] Error code:', err.code)
    console.error('[STRIPE CHECKOUT] Status code:', err.statusCode)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
