import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { claimInviteEmail } from '@/lib/email-templates'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabase()

    // Verify user is added_by for this company
    const { data: company, error: compError } = await supabase
      .from('company_pages')
      .select('id, company_name, claim_token, claim_status, overall_score, added_by, slug')
      .eq('id', id)
      .single()

    if (compError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.added_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Generate claim_token if missing
    let claimToken = company.claim_token
    if (!claimToken) {
      claimToken = crypto.randomBytes(12).toString('hex')
    }

    // Update company with invite info
    await supabase
      .from('company_pages')
      .update({
        claim_token: claimToken,
        claim_invited_email: email,
        claim_status: 'invite_sent',
      })
      .eq('id', id)

    // Look up investor name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single()

    const investorName = profile?.full_name || 'An investor'

    // Send claim invite email
    const { subject, html } = claimInviteEmail({
      investorName,
      companyName: company.company_name,
      score: company.overall_score,
      claimToken,
    })

    await sendEmail({ to: email, subject, html })

    const claimLink = `https://www.kunfa.ai/claim/${claimToken}`

    return NextResponse.json({ success: true, claimLink })
  } catch (error) {
    console.error('Claim invite POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabase()

    // Verify user is added_by
    const { data: company, error } = await supabase
      .from('company_pages')
      .select('id, claim_status, claim_invited_email, claimed_at, added_by')
      .eq('id', id)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.added_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for pending claim request
    const { data: pendingRequest } = await supabase
      .from('claim_requests')
      .select('id, status, requester_email, requester_name')
      .eq('company_id', id)
      .eq('status', 'pending')
      .maybeSingle()

    return NextResponse.json({
      claim_status: company.claim_status,
      claim_invited_email: company.claim_invited_email,
      claimed_at: company.claimed_at,
      pending_request: pendingRequest || null,
    })
  } catch (error) {
    console.error('Claim invite GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
