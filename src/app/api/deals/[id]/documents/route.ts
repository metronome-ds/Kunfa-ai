import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/deals/[id]/documents
 * Get all documents for a deal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const { data: documents, error } = await supabase
      .from('deal_documents')
      .select('*')
      .eq('deal_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: documents || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/deals/[id]/documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deals/[id]/documents
 * Upload a document for a deal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let docFileName: string;
    let filePath: string;
    let fileSize: number;
    let mimeType: string;
    let documentType: string;

    if (contentType.includes('application/json')) {
      // Client already uploaded to Supabase Storage directly
      const body = await request.json();
      docFileName = body.fileName;
      filePath = body.filePath;
      fileSize = body.fileSize || 0;
      mimeType = body.mimeType || 'application/octet-stream';
      documentType = body.documentType || 'other';

      if (!filePath || !docFileName) {
        return NextResponse.json(
          { error: 'filePath and fileName are required' },
          { status: 400 }
        );
      }
    } else {
      // Legacy FormData upload (fallback)
      const formData = await request.formData();
      const file = formData.get('file') as File;
      documentType = (formData.get('document_type') as string) || 'other';

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File too large. Maximum size: 50MB' },
          { status: 400 }
        );
      }

      const storagePath = `${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return NextResponse.json(
          { error: 'Upload failed. Please try again.' },
          { status: 500 }
        );
      }

      docFileName = file.name;
      filePath = storagePath;
      fileSize = file.size;
      mimeType = file.type;
    }

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('deal_documents')
      .insert({
        deal_id: id,
        document_type: documentType,
        file_name: docFileName,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_by: user.id,
        parse_status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document record:', docError);
      // Clean up uploaded file
      await supabase.storage
        .from('documents')
        .remove([filePath]);

      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // TODO: Queue document parsing job with Claude
    // This would be done through a job queue or background process

    return NextResponse.json(
      { data: document, message: 'Document uploaded successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/deals/[id]/documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
