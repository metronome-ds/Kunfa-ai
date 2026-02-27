import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Deal, DealStage } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/deals
 * List deals with filtering, sorting, and pagination
 * Query params:
 * - industry: filter by industry
 * - stage: filter by deal stage
 * - minFunding: minimum funding amount
 * - maxFunding: maximum funding amount
 * - minScore: minimum AI score
 * - maxScore: maximum AI score
 * - sort: 'newest' | 'score' | 'funding' (default: 'newest')
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 * - search: search by company name or title
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;

    // Get query parameters
    const industry = searchParams.get('industry');
    const stage = searchParams.get('stage');
    const minFunding = searchParams.get('minFunding');
    const maxFunding = searchParams.get('maxFunding');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search');

    // Build base query — columns match the actual deals table schema
    let query = supabase
      .from('deals')
      .select(
        `
        id,
        created_by,
        assigned_to,
        company_id,
        stage,
        ai_score,
        sector,
        raise_amount,
        priority_flag,
        is_watchlisted,
        days_in_stage,
        stage_changed_at,
        created_at,
        updated_at,
        company_pages (
          id,
          company_name,
          slug,
          description,
          overall_score,
          industry,
          logo_url
        )
      `,
        { count: 'exact' }
      );

    // Apply filters using actual column names
    if (industry) {
      query = query.eq('sector', industry);
    }

    if (stage) {
      query = query.eq('stage', stage as DealStage);
    }

    if (minFunding) {
      query = query.gte('raise_amount', parseInt(minFunding));
    }

    if (maxFunding) {
      query = query.lte('raise_amount', parseInt(maxFunding));
    }

    if (minScore) {
      query = query.gte('ai_score', parseInt(minScore));
    }

    if (maxScore) {
      query = query.lte('ai_score', parseInt(maxScore));
    }

    // Apply search — search in the related company_pages table isn't possible via .or(),
    // so we filter by sector for now
    if (search) {
      query = query.ilike('sector', `%${search}%`);
    }

    // Apply sorting
    if (sort === 'score') {
      query = query.order('ai_score', { ascending: false, nullsFirst: false });
    } else if (sort === 'funding') {
      query = query.order('raise_amount', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Get total count
    const { count } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: deals, error } = await query;

    if (error) {
      console.error('Error fetching deals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deals' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: deals || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/deals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deals
 * Create a new deal
 * Required fields: company_name, company_description, industry, stage
 * Optional fields: company_website, funding_amount_requested, founder_count, founder_names
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
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

    // Validate required fields
    const company_name = body.company_name;
    const description = body.description || body.company_description;
    const industry = body.industry;
    const stage = body.stage;

    if (!company_name || !description || !industry || !stage) {
      return NextResponse.json(
        { error: 'Missing required fields: company_name, description, industry, stage' },
        { status: 400 }
      );
    }

    // Determine title
    const title = body.title || company_name || 'Untitled Deal';

    // Map pre/post-money valuation to single valuation field
    const valuation = body.valuation || body.post_money_valuation || body.pre_money_valuation || null;

    // Map founder_count to team_size
    const team_size = body.team_size || body.founder_count || null;

    // Create deal
    const { data: deal, error: createError } = await supabase
      .from('deals')
      .insert({
        title,
        company_name,
        description,
        industry,
        stage,
        website: body.website || body.company_website || null,
        funding_amount: body.funding_amount || body.funding_amount_requested || null,
        valuation,
        deal_type: body.deal_type || 'equity',
        problem_statement: body.problem_statement || null,
        solution: body.solution || null,
        market_size: body.market_size || null,
        team_size,
        status: 'active',
        creator_id: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating deal:', createError);
      return NextResponse.json(
        { error: 'Failed to create deal' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: deal, message: 'Deal created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/deals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
