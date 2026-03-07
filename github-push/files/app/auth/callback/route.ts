import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/dashboard'

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if profile exists, create if not (for OAuth signups)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('user_id', data.user.id)
        .single()

      if (!profile) {
        // First time OAuth login — create profile
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
          avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || '',
        })
        return NextResponse.redirect(`${origin}/auth/onboarding`)
      }

      if (!profile.onboarding_completed) {
        return NextResponse.redirect(`${origin}/auth/onboarding`)
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
