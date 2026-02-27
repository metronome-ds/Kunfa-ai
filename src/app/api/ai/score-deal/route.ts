import { NextRequest, NextResponse } from 'next/server';
import { scoreAndUpdateDeal } from '@/lib/scoring-engine';
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server';

/**
 * POST /api/ai/score-deal
 * Scores a deal using the AI scoring engine
 *
 * Request body: { dealId: string }
 * Response: ScoringResponse with overall_score, dimensions, red_flags, green_flags, etc.
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

    // Check if user has access (either assigned or is admin)
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

    // Check if deal has parsed documents
    const { data: documents, error: docsError } = await supabase
      .from('deal_documents')
      .select('id')
      .eq('deal_id', dealId)
      .eq('parse_status', 'completed')
      .limit(1);

    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json(
        {
          message: 'No parsed documents available for scoring. Please upload and parse documents first.',
          code: 'NO_DOCUMENTS',
        },
        { status: 400 }
      );
    }

    // Score the deal
    const updatedDeal = await scoreAndUpdateDeal(dealId, user.id);

    return NextResponse.json({
      overall_score: updatedDeal.ai_score_overall,
      ai_score_team: updatedDeal.ai_score_team,
      ai_score_market: updatedDeal.ai_score_market,
      ai_score_traction: updatedDeal.ai_score_traction,
      ai_score_product: updatedDeal.ai_score_product,
      ai_score_financials: updatedDeal.ai_score_financials,
      ai_score_competitive_landscape: updatedDeal.ai_score_competitive_landscape,
      confidence_level: 'high',
    });
  } catch (error) {
    console.error('Error in score-deal route:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';

    // Check if it's a known error
    if (message.includes('No completed documents')) {
      return NextResponse.json(
        {
          message: 'No parsed documents available. Please upload and parse documents first.',
          code: 'NO_DOCUMENTS',
        },
        { status: 400 }
      );
    }

    if (message.includes('No extracted text')) {
      return NextResponse.json(
        {
          message: 'Documents do not contain extractable text. Try uploading documents with text content.',
          code: 'INVALID_DOCUMENTS',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message, code: 'SCORING_ERROR' },
      { status: 500 }
    );
  }
}
