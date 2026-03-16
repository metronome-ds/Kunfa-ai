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

    // Use explicit app URL, never fall back to request origin (could be localhost/vercel preview)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kunfa.ai'
    const successPath = company?.slug
      ? `/company/${company.slug}?paid=true&sid=${submissionId}`
      : `/dashboard?paid=true&sid=${submissionId}`
    const cancelPath = `/score/${submissionId}`

    const session = await createCheckoutSession(submissionId, baseUrl, successPath, cancelPath)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
