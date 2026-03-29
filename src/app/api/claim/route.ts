import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { companyClaimedNotificationEmail } from '@/lib/email-templates'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Look up company by claim_token
    const { data: company, error: compError } = await supabase
      .from('company_pages')
      .select('id, company_name, slug, claim_status, website_url, added_by, overall_score')
      .eq('claim_token', token)
      .single()

    if (compError || !company) {
      return NextResponse.json({ error: 'Invalid claim token' }, { status: 404 })
    }

    if (company.claim_status === 'claimed') {
      return NextResponse.json({ error: 'Company already claimed' }, { status: 400 })
    }

    // Domain verification
    const userEmail = user.email || ''
    const userDomain = userEmail.split('@')[1]?.toLowerCase()

    let companyDomain: string | null = null
    if (company.website_url) {
      try {
        const url = company.website_url.startsWith('http')
          ? company.website_url
          : `https://${company.website_url}`
        const hostname = new URL(url).hostname.toLowerCase()
        companyDomain = hostname.replace(/^www\./, '')
      } catch {
        // Invalid URL, skip domain matching
      }
    }

    // Auto-approve if: domains match OR no website_url to compare
    const domainMatch = !companyDomain || !!(userDomain && companyDomain && userDomain === companyDomain)

    if (domainMatch) {
      // Auto-approve
      await supabase
        .from('company_pages')
        .update({
          user_id: user.id,
          claim_status: 'claimed',
          claimed_at: new Date().toISOString(),
        })
        .eq('id', company.id)

      // Set profile role to startup + onboarding_completed so ScoreModal skips to upload
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profile && profile.role !== 'startup' && profile.role !== 'founder') {
        await supabase
          .from('profiles')
          .update({ role: 'startup', onboarding_completed: true })
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('user_id', user.id)
      }

      // Notify the investor who added the company
      if (company.added_by && company.added_by !== user.id) {
        const { data: investorProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', company.added_by)
          .single()

        if (investorProfile?.email) {
          const notifEmail = companyClaimedNotificationEmail({
            companyName: company.company_name,
            slug: company.slug,
            score: company.overall_score,
          })
          await sendEmail({ to: investorProfile.email, subject: notifEmail.subject, html: notifEmail.html }).catch(() => {})
        }
      }

      return NextResponse.json({ approved: true, slug: company.slug })
    }

    // No domain match — submit for admin review
    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from('claim_requests')
      .select('id')
      .eq('company_id', company.id)
      .eq('requested_by', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json({ approved: false, pending: true })
    }

    // Get requester profile name
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single()

    // Insert claim request
    await supabase.from('claim_requests').insert({
      company_id: company.id,
      requested_by: user.id,
      requester_email: userEmail,
      requester_name: requesterProfile?.full_name || null,
      status: 'pending',
    })

    // Send admin notification email
    const { data: admins } = await supabase
      .from('profiles')
      .select('email')
      .eq('is_admin', true)

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        if (admin.email) {
          await sendEmail({
            to: admin.email,
            subject: `New claim request: ${company.company_name}`,
            html: `<p>${requesterProfile?.full_name || userEmail} is requesting to claim <strong>${company.company_name}</strong>.</p><p>Email domain does not match company website. Please review at <a href="https://www.kunfa.ai/admin/claims">Admin Claims</a>.</p>`,
          })
        }
      }
    }

    return NextResponse.json({ approved: false, pending: true })
  } catch (error) {
    console.error('Claim POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
