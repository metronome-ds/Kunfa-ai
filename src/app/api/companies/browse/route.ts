import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/companies/browse
 * Browse all public companies on the platform (marketplace view).
 * Queries company_pages directly — NOT the deals table.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const sort = searchParams.get('sort') || 'newest';
    const search = searchParams.get('search') || '';
    const industries = searchParams.getAll('industry');
    const stages = searchParams.getAll('stage');

    let query = supabase
      .from('company_pages')
      .select(
        'id, company_name, slug, description, one_liner, industry, stage, overall_score, raise_amount, country, headquarters, logo_url, created_at',
        { count: 'exact' }
      )
      .eq('is_public', true);

    // Search filter — match on company_name or one_liner
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,one_liner.ilike.%${search}%`);
    }

    // Industry filter
    if (industries.length > 0) {
      query = query.in('industry', industries);
    }

    // Stage filter
    if (stages.length > 0) {
      query = query.in('stage', stages);
    }

    // Sorting
    if (sort === 'score') {
      query = query.order('overall_score', { ascending: false, nullsFirst: false });
    } else if (sort === 'funding') {
      query = query.order('raise_amount', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }

    const total = count || 0;

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/companies/browse:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
