import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'
import { investorReviewInviteEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { investorEmails, companyId, personalMessage } = body as {
      investorEmails?: string[]
      companyId?: string
      personalMessage?: string
    }

    if (!companyId || !investorEmails || !Array.isArray(investorEmails) || investorEmails.length === 0) {
      return NextResponse.json({ error: 'companyId and investorEmails[] are required' }, { status: 400 })
    }

    if (investorEmails.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 invites at a time' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Verify the user owns this company
    const { data: company, error: companyError } = await supabase
      .from('company_pages')
      .select('id, user_id, company_name, slug, overall_score')
      .eq('id', companyId)
      .maybeSingle()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get founder's name for the email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single()

    const founderName = profile?.full_name || company.company_name || 'A founder'

    // Send emails + log invites
    const results: { email: string; sent: boolean }[] = []

    for (const email of investorEmails) {
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        results.push({ email: normalizedEmail, sent: false })
        continue
      }

      // Send the invite email
      const { subject, html } = investorReviewInviteEmail({
        founderName,
        companyName: company.company_name,
        slug: company.slug,
        score: company.overall_score,
        personalMessage: personalMessage?.trim() || undefined,
      })

      const sent = await sendEmail({ to: normalizedEmail, subject, html })

      // Log invite in document_access_log
      const { error: logError } = await supabase
        .from('document_access_log')
        .insert({
          company_id: companyId,
          viewer_email: normalizedEmail,
          viewer_user_id: null,
          access_type: 'invite_sent',
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
          user_agent: request.headers.get('user-agent') || null,
        })

      if (logError) {
        console.error('[invite-investor] Log insert failed:', logError.message)
      }

      results.push({ email: normalizedEmail, sent })
    }

    const sentCount = results.filter((r) => r.sent).length

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: investorEmails.length,
      results,
    })
  } catch (error) {
    console.error('[invite-investor] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
