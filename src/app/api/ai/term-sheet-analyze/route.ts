import { NextRequest, NextResponse } from 'next/server';
import { analyzeTermSheet } from '@/lib/claude';
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server';

/**
 * POST /api/ai/term-sheet-analyze
 * Analyzes a term sheet document for deal terms and risks
 *
 * Request body: { dealId: string, documentId: string }
 * Response: TermSheetAnalysis with valuation, equity, favorable/unfavorable terms, etc.
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
    const { dealId, documentId } = await request.json();

    if (!dealId || typeof dealId !== 'string') {
      return NextResponse.json(
        { message: 'dealId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { message: 'documentId is required and must be a string' },
        { status: 400 }
      );
    }

    // Verify user has access to this deal
    const supabase = await createServerSupabaseClient();
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, company_name, assigned_to')
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
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role !== 'admin') {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Fetch the specific document
    const { data: document, error: docError } = await supabase
      .from('deal_documents')
      .select('extracted_text, document_type')
      .eq('id', documentId)
      .eq('deal_id', dealId)
      .eq('parse_status', 'completed')
      .single();

    if (docError || !document) {
      return NextResponse.json(
        {
          message: 'Document not found or not yet parsed.',
          code: 'DOCUMENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (!document.extracted_text || !document.extracted_text.trim()) {
      return NextResponse.json(
        {
          message: 'Document does not contain extractable text.',
          code: 'INVALID_DOCUMENT',
        },
        { status: 400 }
      );
    }

    // Analyze term sheet using Claude
    const analysis = await analyzeTermSheet(document.extracted_text, deal.company_name);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error in term-sheet-analyze route:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message.includes('Document text is empty')) {
      return NextResponse.json(
        {
          message: 'No document text available for analysis.',
          code: 'INVALID_DOCUMENT',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message, code: 'ANALYSIS_ERROR' },
      { status: 500 }
    );
  }
}
