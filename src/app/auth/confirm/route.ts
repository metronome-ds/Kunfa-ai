import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | 'invite' | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server component cookie setting
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error && data.user) {
      // Recovery flow → redirect to reset-password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }

      // Create profile if it doesn't exist yet
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .single()

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          email: data.user.email,
        })
      }

      // Auto-join: accept all pending team invites for this email
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

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If verification failed, redirect to login with error
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
}
