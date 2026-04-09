import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error && data.user) {
      // Recovery flow → reset-password page
      if (type === 'recovery') {
        redirectTo.pathname = '/reset-password'
        redirectTo.searchParams.delete('next')
        return NextResponse.redirect(redirectTo)
      }

      // Read role from signup metadata
      const role = (data.user.user_metadata?.role as string) || undefined

      // Ensure profile exists for newly confirmed users
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('user_id', data.user.id)
        .single()

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          email: data.user.email,
          ...(role ? { role } : {}),
        })
      }

      // Auto-join: accept any pending team invites for this email
      if (data.user.email) {
        await supabase
          .from('team_members')
          .update({
            member_user_id: data.user.id,
            status: 'accepted',
            updated_at: new Date().toISOString(),
          })
          .eq('invited_email', data.user.email)
          .eq('status', 'pending')
      }

      // For new investors, redirect to onboarding instead of default dashboard
      const hasExplicitNext = searchParams.get('next')
      if (!hasExplicitNext && role === 'investor' && !existingProfile?.onboarding_completed) {
        redirectTo.pathname = '/onboarding'
      }

      redirectTo.searchParams.delete('next')
      return NextResponse.redirect(redirectTo)
    }
  }

  // Verification failed → login with error
  redirectTo.pathname = '/login'
  redirectTo.searchParams.set('error', 'confirmation_failed')
  return NextResponse.redirect(redirectTo)
}
