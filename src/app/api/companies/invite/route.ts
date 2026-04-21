import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { companyInviteEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyName, founderEmail, founderName, message, resend, existingToken } = body as {
      companyName: string
      founderEmail: string
      founderName?: string
      message?: string
      resend?: boolean
      existingToken?: string
    }

    if (!companyName || !founderEmail) {
      return NextResponse.json(
        { error: 'Company name and founder email are required' },
        { status: 400 },
      )
    }

    const supabase = getSupabase()

    // Get investor profile for the email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single()

    const investorName = profile?.full_name || 'An investor'

    // Resend existing invite — just re-send the email
    if (resend && existingToken) {
      const emailContent = companyInviteEmail({
        investorName,
        companyName,
        claimToken: existingToken,
        personalMessage: message || undefined,
      })

      console.log('[INVITE] Attempting to resend invite email to:', founderEmail)
      const sent = await sendEmail({
        to: founderEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      })
      if (sent) {
        console.log('[INVITE] Resend email sent successfully to:', founderEmail)
      } else {
        console.error('[INVITE] Resend email FAILED for:', founderEmail)
      }

      return NextResponse.json({ success: true, resent: true, emailSent: sent })
    }

    // Generate claim token and slug
    const claimToken = crypto.randomBytes(12).toString('hex')
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + crypto.randomBytes(4).toString('hex')

    // Resolve entity context: scope to user's active entity if any
    const supabaseClient = getSupabase()
    const { data: inviterProfile } = await supabaseClient
      .from('profiles')
      .select('active_entity_id')
      .eq('user_id', user.id)
      .single()
    const entityId = inviterProfile?.active_entity_id || null

    // Create company_pages record
    const { data: company, error: insertError } = await supabase
      .from('company_pages')
      .insert({
        company_name: companyName,
        slug,
        source: 'investor_invited',
        added_by: user.id,
        user_id: user.id,
        claim_status: 'invite_sent',
        claim_token: claimToken,
        claim_invited_email: founderEmail,
        is_public: false,
        entity_id: entityId,
      })
      .select('id, slug')
      .single()

    if (insertError) {
      console.error('Failed to create invited company:', insertError)
      return NextResponse.json(
        { error: 'Failed to create company record' },
        { status: 500 },
      )
    }

    // Send invite email
    const emailContent = companyInviteEmail({
      investorName,
      companyName,
      claimToken,
      personalMessage: message || undefined,
    })

    console.log('[INVITE] Attempting to send invite email to:', founderEmail, '| Company:', companyName, '| Investor:', investorName)
    const sent = await sendEmail({
      to: founderEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    })
    if (sent) {
      console.log('[INVITE] Email sent successfully to:', founderEmail)
    } else {
      console.error('[INVITE] Email FAILED to send to:', founderEmail)
    }

    return NextResponse.json({
      success: true,
      companyId: company.id,
      slug: company.slug,
      claimToken,
      emailSent: sent,
    })
  } catch (error) {
    console.error('Company invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
