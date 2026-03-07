import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/pipeline
 * List user's deals grouped by stage, joined with company_pages
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query deals joined with company_pages
    const { data: deals, error } = await supabase
      .from('deals')
      .select(
        `
        id,
        stage,
        ai_score,
        sector,
        raise_amount,
        days_in_stage,
        stage_changed_at,
        notes,
        created_at,
        company_pages!company_id (
          id,
          company_name,
          slug,
          overall_score,
          industry,
          raise_amount
        )
      `
      )
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pipeline deals:', error);
      return NextResponse.json({ error: 'Failed to fetch pipeline deals' }, { status: 500 });
    }

    // Group by stage into 5 columns
    const grouped: Record<string, any[]> = {
      sourced: [],
      screening: [],
      due_diligence: [],
      term_sheet: [],
      closed: [],
    };

    deals?.forEach((deal) => {
      const stage = deal.stage;
      if (stage && stage in grouped) {
        // Compute days_in_stage from stage_changed_at
        const stageChanged = deal.stage_changed_at ? new Date(deal.stage_changed_at) : new Date(deal.created_at);
        const daysInStage = Math.floor((Date.now() - stageChanged.getTime()) / (1000 * 60 * 60 * 24));

        const company = deal.company_pages as any;
        grouped[stage].push({
          id: deal.id,
          stage: deal.stage,
          company_name: company?.company_name || 'Unknown',
          slug: company?.slug,
          ai_score: deal.ai_score || company?.overall_score || null,
          sector: deal.sector || company?.industry || null,
          raise_amount: deal.raise_amount || company?.raise_amount || null,
          days_in_stage: daysInStage,
          notes: deal.notes,
        });
      }
    });

    return NextResponse.json({ data: grouped, total: deals?.length || 0 }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/pipeline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
