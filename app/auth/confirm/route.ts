import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'recovery' | 'invite' | null

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_token`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type === 'email' ? 'email' : type === 'recovery' ? 'recovery' : 'email',
  })

  if (error || !data.user) {
    console.error('Email confirmation error:', error)
    return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`)
  }

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, onboarding_completed')
    .eq('user_id', data.user.id)
    .single()

  if (!profile) {
    // First time — create profile after email verification
    await supabase.from('profiles').insert({
      user_id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || '',
      avatar_url: data.user.user_metadata?.avatar_url || '',
    })
    return NextResponse.redirect(`${origin}/auth/onboarding`)
  }

  if (!profile.onboarding_completed) {
    return NextResponse.redirect(`${origin}/auth/onboarding`)
  }

  // Password recovery — redirect to reset password page
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/dashboard/settings`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
