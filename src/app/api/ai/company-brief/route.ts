import { NextRequest, NextResponse } from 'next/server';
import { generateCompanyBrief } from '@/lib/claude';
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server';

/**
 * POST /api/ai/company-brief
 * Generates a comprehensive company brief from deal documents
 *
 * Request body: { dealId: string }
 * Response: CompanyBrief with executive summary, team, product, financial info, etc.
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
    const { dealId } = await request.json();

    if (!dealId || typeof dealId !== 'string') {
      return NextResponse.json(
        { message: 'dealId is required and must be a string' },
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

    // Fetch parsed documents
    const { data: documents, error: docsError } = await supabase
      .from('deal_documents')
      .select('extracted_text')
      .eq('deal_id', dealId)
      .eq('parse_status', 'completed');

    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json(
        {
          message: 'No parsed documents available. Please upload and parse documents first.',
          code: 'NO_DOCUMENTS',
        },
        { status: 400 }
      );
    }

    // Combine extracted text from all documents
    const combinedText = documents
      .map((doc: { extracted_text: string | null }) => doc.extracted_text || '')
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!combinedText.trim()) {
      return NextResponse.json(
        {
          message: 'Documents do not contain extractable text.',
          code: 'INVALID_DOCUMENTS',
        },
        { status: 400 }
      );
    }

    // Generate brief using Claude
    const brief = await generateCompanyBrief(combinedText, deal.company_name);

    return NextResponse.json(brief);
  } catch (error) {
    console.error('Error in company-brief route:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message.includes('Document text is empty')) {
      return NextResponse.json(
        {
          message: 'No document text available for brief generation.',
          code: 'INVALID_DOCUMENTS',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message, code: 'GENERATION_ERROR' },
      { status: 500 }
    );
  }
}
