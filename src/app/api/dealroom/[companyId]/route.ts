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

// GET — list all documents for a company
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

    const { data: docs, error } = await supabase
      .from('dealroom_documents')
      .select('id, company_id, uploaded_by, file_name, file_url, file_size, file_type, category, description, is_public, created_at')
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

    const docsWithNames = (docs || []).map(d => ({
      ...d,
      uploaded_by_name: uploaderNames[d.uploaded_by] || 'Unknown',
    }))

    return NextResponse.json({ documents: docsWithNames })
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

    const contentType = request.headers.get('content-type') || ''
    const supabase = getServiceClient()

    let fileName: string
    let fileUrl: string
    let fileSize: number
    let fileType: string
    let category: string
    let description: string | null
    let isPublic = true

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
