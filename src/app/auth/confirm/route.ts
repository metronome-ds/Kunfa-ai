import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    // Use the cookie-based client for OTP verification (sets session cookies)
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (error) {
      console.error('[AUTH CONFIRM] OTP verification failed:', error.message)
    }

    if (!error && data.user) {
      console.log('[AUTH CONFIRM] User verified:', data.user.id, data.user.email, JSON.stringify(data.user.user_metadata))

      // Recovery flow → reset-password page
      if (type === 'recovery') {
        redirectTo.pathname = '/reset-password'
        redirectTo.searchParams.delete('next')
        return NextResponse.redirect(redirectTo)
      }

      // Use service role client for all DB operations (bypasses RLS)
      const adminDb = getSupabase()

      // Read role and invite from signup metadata
      const metadataRole = (data.user.user_metadata?.role as string) || undefined
      const inviteFromMeta = (data.user.user_metadata?.invite as string) || undefined

      console.log('[AUTH CONFIRM] Metadata — role:', metadataRole, '| invite:', inviteFromMeta)

      // Check if profile already exists
      const { data: existingProfile, error: profileCheckErr } = await adminDb
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('user_id', data.user.id)
        .single()

      console.log('[AUTH CONFIRM] Existing profile check:', existingProfile ? 'found' : 'not found', profileCheckErr?.code || '')

      // Detect if this is an invite signup by looking for any pending team_member for this email.
      // This is the source of truth — more reliable than user_metadata.invite which may be stale.
      let teamOwnerRole: string | undefined
      let isInviteSignup = false
      if (data.user.email) {
        const { data: pendingInvite } = await adminDb
          .from('team_members')
          .select('id, team_id')
          .eq('invited_email', data.user.email)
          .eq('status', 'pending')
          .limit(1)
          .maybeSingle()

        if (pendingInvite) {
          isInviteSignup = true
          // Look up the team owner's user role — the new member inherits this
          const { data: ownerProfile } = await adminDb
            .from('profiles')
            .select('role')
            .eq('id', pendingInvite.team_id)
            .single()
          teamOwnerRole = ownerProfile?.role || undefined
          console.log('[AUTH CONFIRM] Invite signup detected — team owner role:', teamOwnerRole)
        }
      }

      // Determine the role to assign.
      // For invite signups: always use the team owner's role (ignore metadata which may say 'investor').
      // For normal signups: use the metadata role from the signup form.
      const role = isInviteSignup ? teamOwnerRole : metadataRole

      // Create profile if it doesn't exist
      if (!existingProfile) {
        const profilePayload = {
          user_id: data.user.id,
          email: data.user.email,
          ...(role ? { role } : {}),
          // Invite signups skip onboarding — they're joining an existing team
          onboarding_completed: isInviteSignup,
        }
        const { data: insertedProfile, error: profileInsertErr } = await adminDb
          .from('profiles')
          .insert(profilePayload)
          .select('id')
          .single()

        console.log('[AUTH CONFIRM] Profile insert result:', insertedProfile?.id || 'null', '| error:', profileInsertErr?.message || 'none')
      }

      // Auto-join: accept any pending team invites for this email
      let inviteAccepted = false
      if (data.user.email) {
        const { data: joinResult, error: joinErr } = await adminDb
          .from('team_members')
          .update({
            member_user_id: data.user.id,
            status: 'accepted',
            updated_at: new Date().toISOString(),
          })
          .eq('invited_email', data.user.email)
          .eq('status', 'pending')
          .select('id')

        inviteAccepted = !!(joinResult && joinResult.length > 0)
        console.log('[AUTH CONFIRM] Team join result:', joinResult?.length || 0, 'invites accepted | error:', joinErr?.message || 'none')
      }

      // Determine redirect
      const hasExplicitNext = searchParams.get('next')
      if (!hasExplicitNext) {
        if (isInviteSignup || inviteAccepted || inviteFromMeta) {
          // Invite signup — go straight to dashboard (joining existing team, no onboarding)
          redirectTo.pathname = '/dashboard'
        } else if (role === 'investor' && !existingProfile?.onboarding_completed) {
          // New investor — needs onboarding
          redirectTo.pathname = '/onboarding'
        } else {
          // Default
          redirectTo.pathname = '/dashboard'
        }
      }

      console.log('[AUTH CONFIRM] Redirecting to:', redirectTo.pathname)

      redirectTo.searchParams.delete('next')
      return NextResponse.redirect(redirectTo)
    }
  }

  // Verification failed → login with error
  redirectTo.pathname = '/login'
  redirectTo.searchParams.set('error', 'confirmation_failed')
  return NextResponse.redirect(redirectTo)
}
