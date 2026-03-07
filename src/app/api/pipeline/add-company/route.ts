import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/pipeline/add-company
 * Add a company to the investor's pipeline by company_id.
 * Finds or creates a deals record for the company.
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

    const { companyId } = await request.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Check if a deal already exists for this company + investor
    const { data: existing } = await supabase
      .from('deals')
      .select('id, stage')
      .eq('created_by', user.id)
      .eq('company_id', companyId)
      .single();

    if (existing) {
      return NextResponse.json({ data: existing, message: 'Already in pipeline' }, { status: 200 });
    }

    // Get company details for the deal record
    const { data: company } = await supabase
      .from('company_pages')
      .select('overall_score, industry, raise_amount')
      .eq('id', companyId)
      .single();

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        created_by: user.id,
        company_id: companyId,
        stage: 'sourced',
        ai_score: company?.overall_score || null,
        sector: company?.industry || null,
        raise_amount: company?.raise_amount || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating pipeline deal:', error);
      return NextResponse.json({ error: 'Failed to add to pipeline' }, { status: 500 });
    }

    return NextResponse.json({ data: deal, message: 'Added to pipeline' }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pipeline/add-company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
