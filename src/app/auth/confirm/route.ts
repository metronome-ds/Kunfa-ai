import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * GET /auth/confirm
 *
 * Kept only for password recovery (type=recovery). Signup verification
 * has moved to an OTP code entered on the signup page itself.
 *
 * If a legacy signup confirmation link is clicked (type=email), we
 * redirect to /login with a friendly message.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  // Legacy signup confirmation link → we now use OTP codes on the signup page.
  if (type === 'email') {
    redirectTo.pathname = '/login'
    redirectTo.searchParams.set(
      'message',
      'Please sign in — your account may already be verified.',
    )
    redirectTo.searchParams.delete('next')
    return NextResponse.redirect(redirectTo)
  }

  if (token_hash && type === 'recovery') {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (error) {
      console.error('[AUTH CONFIRM] recovery verification failed:', error.message)
      redirectTo.pathname = '/login'
      redirectTo.searchParams.set('error', 'confirmation_failed')
      redirectTo.searchParams.delete('next')
      return NextResponse.redirect(redirectTo)
    }

    redirectTo.pathname = '/reset-password'
    redirectTo.searchParams.delete('next')
    return NextResponse.redirect(redirectTo)
  }

  // Unknown / missing parameters → back to login
  redirectTo.pathname = '/login'
  redirectTo.searchParams.set('error', 'confirmation_failed')
  redirectTo.searchParams.delete('next')
  return NextResponse.redirect(redirectTo)
}
