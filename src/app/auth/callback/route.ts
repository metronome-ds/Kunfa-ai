import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Create profile if it doesn't exist yet
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', data.user.id)
        .single()

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          email: data.user.email,
        })
        // New user — needs role selection
        return NextResponse.redirect(new URL('/signup?step=role', origin))
      }

      // Existing user without a role set (or default 'founder' from old signup)
      const role = existingProfile.role
      if (!role || role === 'founder') {
        // Check if they came from the old onboarding — if role is 'founder', treat as set
        // Only redirect to role selection if role is null/empty
        if (!role) {
          return NextResponse.redirect(new URL('/signup?step=role', origin))
        }
      }

      // Route based on role
      if (role === 'startup') {
        return NextResponse.redirect(new URL('/', origin))
      } else if (role === 'investor') {
        return NextResponse.redirect(new URL('/dashboard', origin))
      }

      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
}
