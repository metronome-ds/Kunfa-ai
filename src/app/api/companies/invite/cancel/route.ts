import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId } = await request.json()
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Verify the company exists and was added by this user
    const { data: company, error: fetchError } = await supabase
      .from('company_pages')
      .select('id, added_by, claim_status')
      .eq('id', companyId)
      .single()

    if (fetchError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.added_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (company.claim_status === 'claimed') {
      return NextResponse.json({ error: 'Company already claimed, cannot cancel' }, { status: 400 })
    }

    // Cancel the invite
    const { error: updateError } = await supabase
      .from('company_pages')
      .update({
        claim_status: 'cancelled',
        claim_token: null,
        claim_invited_email: null,
      })
      .eq('id', companyId)

    if (updateError) {
      console.error('[INVITE] Cancel failed:', updateError)
      return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 })
    }

    console.log('[INVITE] Invite cancelled for company:', companyId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[INVITE] Cancel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
