import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/pipeline/move-to-pipeline
 * Creates a deals row for a watchlisted company.
 * Does NOT remove from watchlist.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id } = await request.json();
    if (!company_id) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    // Check if deal already exists for this company + investor
    const { data: existing } = await supabase
      .from('deals')
      .select('id, stage')
      .eq('created_by', user.id)
      .eq('company_id', company_id)
      .single();

    if (existing) {
      return NextResponse.json({ data: existing, message: 'Already in pipeline' }, { status: 200 });
    }

    // Get company details
    const { data: company } = await supabase
      .from('company_pages')
      .select('overall_score, industry, raise_amount')
      .eq('id', company_id)
      .single();

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        created_by: user.id,
        company_id,
        stage: 'sourced',
        ai_score: company?.overall_score || null,
        sector: company?.industry || null,
        raise_amount: company?.raise_amount || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating deal from watchlist:', error);
      return NextResponse.json({ error: 'Failed to add to pipeline' }, { status: 500 });
    }

    return NextResponse.json({ data: deal }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pipeline/move-to-pipeline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
