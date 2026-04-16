import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Allowed types & size limits per upload kind
// ---------------------------------------------------------------------------

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.apple.keynote',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
]

const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]

const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024 // 50 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

type UploadKind = 'document' | 'image'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function validateFile(file: File, kind: UploadKind): string | null {
  if (kind === 'image') {
    if (file.size > MAX_IMAGE_SIZE) {
      return 'Image too large (max 5 MB)'
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      return `Unsupported image type (${file.type || 'unknown'}). Allowed: PNG, JPEG, WebP, SVG, GIF.`
    }
  } else {
    if (file.size > MAX_DOCUMENT_SIZE) {
      return 'File too large (max 50 MB)'
    }
    if (file.type && !DOCUMENT_TYPES.includes(file.type)) {
      return `Unsupported file type (${file.type}). Allowed: PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, CSV, Keynote.`
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user — uploads must be authenticated
    const authSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const pathname = formData.get('pathname') as string | null
    const kindRaw = formData.get('kind') as string | null
    const kind: UploadKind = kindRaw === 'image' ? 'image' : 'document'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Server-side validation (defense in depth; client also validates)
    const validationError = validateFile(file, kind)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Default path: {kind}/{user.id}/{timestamp}-{sanitized-name}
    // Sanitize filename to prevent path traversal or weird chars
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
    const defaultPath = `${kind === 'image' ? 'logos' : 'documents'}/${user.id}/${Date.now()}-${safeName}`
    const filePath = pathname || defaultPath
    const buffer = Buffer.from(await file.arrayBuffer())

    const supabase = getServiceClient()
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      console.error('[UPLOAD] Storage error:', error)
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
      size: file.size,
      type: file.type,
      name: file.name,
    })
  } catch (error) {
    console.error('[UPLOAD] Route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 },
    )
  }
}
