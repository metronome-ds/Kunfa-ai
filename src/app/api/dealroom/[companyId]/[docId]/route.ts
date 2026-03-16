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

// DELETE — delete a document (only uploader or company owner)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string; docId: string }> }
) {
  try {
    const { companyId, docId } = await params
    if (!UUID_REGEX.test(companyId) || !UUID_REGEX.test(docId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    // Check if user can delete (uploader or company owner)
    const { data: doc } = await supabase
      .from('dealroom_documents')
      .select('id, uploaded_by, company_id')
      .eq('id', docId)
      .eq('company_id', companyId)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user is uploader or company owner
    const isUploader = doc.uploaded_by === user.id

    const { data: company } = await supabase
      .from('company_pages')
      .select('user_id, added_by')
      .eq('id', companyId)
      .single()

    const isOwner = company?.user_id === user.id || company?.added_by === user.id

    if (!isUploader && !isOwner) {
      return NextResponse.json({ error: 'Not authorized to delete this document' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('dealroom_documents')
      .delete()
      .eq('id', docId)

    if (deleteError) {
      console.error('Dealroom delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dealroom DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
