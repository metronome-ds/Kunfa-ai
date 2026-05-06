import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requirePermission } from '@/lib/permissions'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// PATCH — update document metadata (category, description, is_public)
export async function PATCH(
  request: NextRequest,
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

    // Permission check: only owner/admin can edit documents
    try {
      await requirePermission(user.id, 'edit')
    } catch {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 })
    }

    const supabase = getServiceClient()

    // Check authorization
    const { data: doc } = await supabase
      .from('dealroom_documents')
      .select('id, uploaded_by, company_id')
      .eq('id', docId)
      .eq('company_id', companyId)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const isUploader = doc.uploaded_by === user.id
    const { data: company } = await supabase
      .from('company_pages')
      .select('user_id, added_by')
      .eq('id', companyId)
      .single()

    const isOwner = company?.user_id === user.id || company?.added_by === user.id
    if (!isUploader && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.category !== undefined) updates.category = body.category
    if (body.description !== undefined) updates.description = body.description
    if (body.is_public !== undefined) updates.is_public = body.is_public
    if (body.file_name !== undefined) updates.file_name = body.file_name
    // Support replacing the file URL (for document replace)
    if (body.file_url !== undefined) updates.file_url = body.file_url
    if (body.file_size !== undefined) updates.file_size = body.file_size
    if (body.file_type !== undefined) updates.file_type = body.file_type

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('dealroom_documents')
      .update(updates)
      .eq('id', docId)
      .select()
      .single()

    if (updateError) {
      console.error('Dealroom patch error:', updateError)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    return NextResponse.json({ document: updated })
  } catch (error) {
    console.error('Dealroom PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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

    // Permission check: only owner/admin can delete documents
    try {
      await requirePermission(user.id, 'edit')
    } catch {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 })
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
