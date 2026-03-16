import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// PATCH — toggle active/inactive
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    if (!UUID_REGEX.test(linkId)) {
      return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 })
    }

    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = getServiceClient()

    const updates: Record<string, unknown> = {}
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
    if (typeof body.allow_download === 'boolean') updates.allow_download = body.allow_download

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: link, error } = await supabase
      .from('dealroom_links')
      .update(updates)
      .eq('id', linkId)
      .eq('created_by', user.id)
      .select()
      .single()

    if (error || !link) {
      return NextResponse.json({ error: 'Link not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ link })
  } catch (error) {
    console.error('Link PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — delete a share link
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    if (!UUID_REGEX.test(linkId)) {
      return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 })
    }

    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('dealroom_links')
      .delete()
      .eq('id', linkId)
      .eq('created_by', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Link DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
