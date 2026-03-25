import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { claimApprovedEmail, claimRejectedEmail } from '@/lib/email-templates'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejection_reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get claim request with company info
    const { data: claimRequest, error: crError } = await supabase
      .from('claim_requests')
      .select('id, company_id, requested_by, requester_email, status')
      .eq('id', id)
      .single()

    if (crError || !claimRequest) {
      return NextResponse.json({ error: 'Claim request not found' }, { status: 404 })
    }

    if (claimRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Claim request already processed' }, { status: 400 })
    }

    // Get company info
    const { data: company } = await supabase
      .from('company_pages')
      .select('id, company_name, slug')
      .eq('id', claimRequest.company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (action === 'approve') {
      // Update claim request
      await supabase
        .from('claim_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      // Set company ownership
      await supabase
        .from('company_pages')
        .update({
          user_id: claimRequest.requested_by,
          claim_status: 'claimed',
          claimed_at: new Date().toISOString(),
        })
        .eq('id', claimRequest.company_id)

      // Update requester profile role
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', claimRequest.requested_by)
        .single()

      if (requesterProfile && requesterProfile.role !== 'startup' && requesterProfile.role !== 'founder') {
        await supabase
          .from('profiles')
          .update({ role: 'startup' })
          .eq('user_id', claimRequest.requested_by)
      }

      // Send approval email
      const { subject, html } = claimApprovedEmail({
        companyName: company.company_name,
        slug: company.slug,
      })
      await sendEmail({ to: claimRequest.requester_email, subject, html })

      return NextResponse.json({ success: true, action: 'approved' })
    }

    // Reject
    await supabase
      .from('claim_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    // Send rejection email
    const { subject, html } = claimRejectedEmail({
      companyName: company.company_name,
      reason: rejection_reason,
    })
    await sendEmail({ to: claimRequest.requester_email, subject, html })

    return NextResponse.json({ success: true, action: 'rejected' })
  } catch (error) {
    console.error('Admin claims PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
