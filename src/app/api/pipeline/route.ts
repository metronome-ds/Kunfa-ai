import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/pipeline
 * List user's pipeline deals grouped by stage
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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

    // Get pipeline deals for this user
    const { data: pipelineDeals, error } = await supabase
      .from('deal_pipeline')
      .select(
        `
        *,
        deals (
          id,
          company_name,
          industry,
          overall_score,
          stage,
          company_description,
          funding_amount_requested
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pipeline deals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pipeline deals' },
        { status: 500 }
      );
    }

    // Group by stage
    const grouped: Record<string, any[]> = {
      sourcing: [],
      screening: [],
      diligence: [],
      close: [],
    };

    pipelineDeals?.forEach((deal) => {
      const stage = deal.current_stage;
      if (stage in grouped) {
        (grouped[stage as keyof typeof grouped] as any[]).push(deal);
      }
    });

    return NextResponse.json(
      { data: grouped, total: pipelineDeals?.length || 0 },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/pipeline:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipeline
 * Add deal to pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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

    const body = await request.json();
    const { dealId, stage = 'sourcing', notes } = body;

    if (!dealId) {
      return NextResponse.json(
        { error: 'dealId is required' },
        { status: 400 }
      );
    }

    // Check if deal already in pipeline
    const { data: existing } = await supabase
      .from('deal_pipeline')
      .select('id')
      .eq('user_id', user.id)
      .eq('deal_id', dealId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Deal already in pipeline' },
        { status: 409 }
      );
    }

    // Add to pipeline
    const { data, error } = await supabase
      .from('deal_pipeline')
      .insert({
        user_id: user.id,
        deal_id: dealId,
        current_stage: stage,
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding deal to pipeline:', error);
      return NextResponse.json(
        { error: 'Failed to add deal to pipeline' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/pipeline:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
