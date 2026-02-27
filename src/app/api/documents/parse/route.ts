import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

/**
 * POST /api/documents/parse
 * Parses a document using Claude API to extract text content
 *
 * Request body: { documentId: string }
 * Response: { extracted_text: string, parse_status: 'completed' }
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

    // Parse request body
    const { documentId } = await request.json();

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { message: 'documentId is required and must be a string' },
        { status: 400 }
      );
    }

    // Fetch document record
    const supabase = await createServerSupabaseClient();
    const { data: document, error: docError } = await supabase
      .from('deal_documents')
      .select('id, deal_id, file_url, mime_type')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the deal
    const { data: deal } = await supabase
      .from('deals')
      .select('id, assigned_to')
      .eq('id', document.deal_id)
      .single();

    if (!deal || deal.assigned_to !== user.id) {
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

    // Update status to processing
    await supabase
      .from('deal_documents')
      .update({ parse_status: 'processing' })
      .eq('id', documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_url.split('/storage/v1/object/public/documents/')[1]);

    if (downloadError || !fileData) {
      await supabase
        .from('deal_documents')
        .update({
          parse_status: 'failed',
          parse_error: 'Failed to download file from storage',
        })
        .eq('id', documentId);

      return NextResponse.json(
        { message: 'Failed to download document' },
        { status: 500 }
      );
    }

    // Convert file to base64
    const buffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    try {
      // Use Claude API to extract text from document
      const message = await client.messages.create({
        model: 'claude-opus-4-20250805',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: 'Please extract all text content from this document. Preserve the structure and formatting as much as possible. Return only the extracted text without any additional commentary.',
              },
            ],
          },
        ],
      });

      const extractedText =
        message.content[0]?.type === 'text' ? message.content[0].text : '';

      if (!extractedText || extractedText.trim().length === 0) {
        await supabase
          .from('deal_documents')
          .update({
            parse_status: 'failed',
            parse_error: 'Document appears to be empty or contains no extractable text',
          })
          .eq('id', documentId);

        return NextResponse.json(
          {
            message: 'Document contains no extractable text',
            code: 'NO_TEXT_CONTENT',
          },
          { status: 400 }
        );
      }

      // Update document with extracted text
      const { data: updatedDoc, error: updateError } = await supabase
        .from('deal_documents')
        .update({
          extracted_text: extractedText,
          parse_status: 'completed',
          parse_error: null,
        })
        .eq('id', documentId)
        .select()
        .single();

      if (updateError || !updatedDoc) {
        return NextResponse.json(
          { message: 'Failed to update document with extracted text' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        document: updatedDoc,
        extracted_text: extractedText,
        parse_status: 'completed',
      });
    } catch (error) {
      console.error('Error parsing document with Claude:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to parse document';

      // Update document status to failed
      await supabase
        .from('deal_documents')
        .update({
          parse_status: 'failed',
          parse_error: errorMessage,
        })
        .eq('id', documentId);

      return NextResponse.json(
        { message: 'Failed to extract text from document', code: 'PARSE_ERROR' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in documents parse route:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { message, code: 'PARSE_ERROR' },
      { status: 500 }
    );
  }
}
