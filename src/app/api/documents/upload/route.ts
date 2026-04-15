import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/documents/upload
 * Uploads a document for a deal and stores it in Supabase Storage
 *
 * Request: multipart form data with:
 *   - file: File object
 *   - dealId: string
 *   - documentType: DocumentType (pitch_deck, executive_summary, financial_statement, term_sheet, other)
 *
 * Response: DealDocument object with file URL and parse_status = 'pending'
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const dealId = formData.get('dealId') as string | null;
    const documentType = (formData.get('documentType') as string) || 'other';

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { message: 'file is required' },
        { status: 400 }
      );
    }

    if (!dealId || typeof dealId !== 'string') {
      return NextResponse.json(
        { message: 'dealId is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          message: 'Invalid file type. Accepted: PDF, PowerPoint, Word, Excel, CSV, TXT, PNG, JPG',
          code: 'INVALID_FILE_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          message: `File too large. Maximum size: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // Verify deal exists and user has access
    const supabase = await createServerSupabaseClient();
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, assigned_to')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { message: 'Deal not found' },
        { status: 404 }
      );
    }

    // Check if user has access
    if (deal.assigned_to !== user.id) {
      const { data: userData } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (userData?.role !== 'admin') {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const filePath = `deals/${dealId}/${uniqueFileName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, new Uint8Array(fileBuffer), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { message: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl || '';

    // Create document record in database
    const documentId = uuidv4();
    const { data: document, error: docError } = await supabase
      .from('deal_documents')
      .insert({
        id: documentId,
        deal_id: dealId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        parse_status: 'pending',
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (docError || !document) {
      // Try to clean up uploaded file
      await supabase.storage
        .from('documents')
        .remove([filePath])
        .catch(() => {
          // Ignore cleanup errors
        });

      return NextResponse.json(
        { message: 'Failed to create document record' },
        { status: 500 }
      );
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error in documents upload route:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
