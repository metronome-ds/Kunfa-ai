import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check if user exists with this email
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('Error checking email:', error)
      return NextResponse.json({ exists: false })
    }

    const existingUser = data.users.find(u => u.email === email)

    // Also check if they already have a submission
    let hasSubmission = false
    if (existingUser) {
      const { data: submission } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', existingUser.id)
        .single()
      hasSubmission = !!submission
    }

    return NextResponse.json({
      exists: !!existingUser,
      hasSubmission,
    })
  } catch (err) {
    console.error('Check email error:', err)
    return NextResponse.json({ exists: false, hasSubmission: false })
  }
}
