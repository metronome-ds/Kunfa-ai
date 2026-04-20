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

// GET — list all documents for a company
// Returns all open (is_public) docs to everyone.
// Restricted docs: only returns file_url if viewer is authorized
// (company owner, team member, invited investor, or pipeline investor).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    if (!UUID_REGEX.test(companyId)) {
      return NextResponse.json({ error: 'Invalid company ID' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // --- Determine viewer authorization for restricted docs ---
    let canViewRestricted = false
    try {
      const authSupabase = await createServerSupabaseClient()
      const { data: { user } } = await authSupabase.auth.getUser()

      if (user) {
        // Fetch company owner info
        const { data: company } = await supabase
          .from('company_pages')
          .select('user_id, added_by, entity_id')
          .eq('id', companyId)
          .maybeSingle()

        if (company) {
          // Check: owner or investor who added it
          if (company.user_id === user.id || company.added_by === user.id) {
            canViewRestricted = true
          }

          // Check: entity member (new path) — if company has entity_id, check entity membership
          if (!canViewRestricted && company.entity_id) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle()
            if (userProfile) {
              const { data: entityMembership } = await supabase
                .from('entity_members')
                .select('id')
                .eq('entity_id', company.entity_id)
                .eq('user_id', userProfile.id)
                .eq('status', 'active')
                .limit(1)
                .maybeSingle()
              if (entityMembership) canViewRestricted = true
            }
          }

          // Legacy team_members check removed — entity_members above is the
          // sole membership source. If user has access via entity membership,
          // it was already resolved above.

          // Check: pipeline investor (has deal for this company)
          if (!canViewRestricted) {
            const { data: deal } = await supabase
              .from('deals')
              .select('id')
              .eq('created_by', user.id)
              .eq('company_id', companyId)
              .limit(1)
              .maybeSingle()
            if (deal) canViewRestricted = true
          }

          // Check: invited investor (document_access_log with invite_sent)
          if (!canViewRestricted && user.email) {
            const { data: invite } = await supabase
              .from('document_access_log')
              .select('id')
              .eq('company_id', companyId)
              .eq('viewer_email', user.email.toLowerCase())
              .eq('access_type', 'invite_sent')
              .limit(1)
              .maybeSingle()
            if (invite) canViewRestricted = true
          }
        }
      }
    } catch {
      // Auth check failed — treat as unauthorized for restricted docs
    }

    // --- Fetch documents ---
    const { data: docs, error } = await supabase
      .from('dealroom_documents')
      .select('id, company_id, uploaded_by, file_name, file_url, file_size, file_type, category, description, is_public, is_private, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Dealroom GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Fetch uploader names
    const uploaderIds = [...new Set((docs || []).map(d => d.uploaded_by).filter(Boolean))]
    let uploaderNames: Record<string, string> = {}
    if (uploaderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', uploaderIds)

      if (profiles) {
        uploaderNames = Object.fromEntries(
          profiles.map(p => [p.user_id, p.full_name || 'Unknown'])
        )
      }
    }

    // Filter out private docs for non-owners (investors never see private docs)
    const visibleDocs = canViewRestricted
      ? (docs || [])
      : (docs || []).filter(d => !d.is_private)

    // Strip file_url from restricted docs for unauthorized viewers
    const docsWithNames = visibleDocs.map(d => ({
      ...d,
      file_url: d.is_public || canViewRestricted ? d.file_url : null,
      restricted: !d.is_public && !canViewRestricted,
      uploaded_by_name: uploaderNames[d.uploaded_by] || 'Unknown',
    }))

    return NextResponse.json({ documents: docsWithNames, canViewRestricted })
  } catch (error) {
    console.error('Dealroom GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — upload a new document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    if (!UUID_REGEX.test(companyId)) {
      return NextResponse.json({ error: 'Invalid company ID' }, { status: 400 })
    }

    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check: only owner/admin can upload documents
    try {
      await requirePermission(user.id, 'edit')
    } catch {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    const supabase = getServiceClient()

    let fileName: string
    let fileUrl: string
    let fileSize: number
    let fileType: string
    let category: string
    let description: string | null
    let isPublic = true
    let isPrivate = false

    if (contentType.includes('application/json')) {
      // Client already uploaded to Supabase Storage directly
      const body = await request.json()
      fileName = body.fileName
      fileUrl = body.fileUrl
      fileSize = body.fileSize || 0
      fileType = body.fileType || 'application/octet-stream'
      category = body.category || 'other'
      description = body.description || null
      if (body.isPublic !== undefined) isPublic = body.isPublic
      isPrivate = body.isPrivate === true

      if (!fileUrl || !fileName) {
        return NextResponse.json({ error: 'fileUrl and fileName are required' }, { status: 400 })
      }
    } else {
      // Legacy FormData upload (fallback)
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      category = (formData.get('category') as string) || 'other'
      description = (formData.get('description') as string) || null

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
      }

      const timestamp = Date.now()
      const filePath = `dealroom/${companyId}/${timestamp}/${file.name}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path)

      fileName = file.name
      fileUrl = urlData.publicUrl
      fileSize = file.size
      fileType = file.type || 'application/octet-stream'
    }

    // Create dealroom_documents record
    const { data: doc, error: insertError } = await supabase
      .from('dealroom_documents')
      .insert({
        company_id: companyId,
        uploaded_by: user.id,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize,
        file_type: fileType,
        category,
        description,
        is_public: isPublic,
        is_private: isPrivate,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Dealroom insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
    }

    return NextResponse.json({ document: doc })
  } catch (error) {
    console.error('Dealroom POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
