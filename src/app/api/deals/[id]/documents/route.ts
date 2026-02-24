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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: 50MB` },
        { status: 400 }
      );
    }

    // Upload file to Supabase Storage
    const fileName = `${id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('deal_documents')
      .insert({
        deal_id: id,
        document_type: documentType || 'other',
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
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
        .remove([fileName]);

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
