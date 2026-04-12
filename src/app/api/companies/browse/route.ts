import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/companies/browse
 * Browse all public companies on the platform (marketplace view).
 * Queries company_pages directly — NOT the deals table.
 *
 * Query params:
 *   page, limit, sort (score|newest|raising), search,
 *   industry[] OR sectors (comma-separated),
 *   stage[] OR stages (comma-separated),
 *   raising=true
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const sort = searchParams.get('sort') || 'score';
    const search = searchParams.get('search') || '';
    const raisingOnly = searchParams.get('raising') === 'true';

    // Accept both industry[] (multi-value) and sectors (comma-separated)
    let industries = searchParams.getAll('industry');
    const sectorsParam = searchParams.get('sectors');
    if (sectorsParam) {
      industries = [...industries, ...sectorsParam.split(',').map(s => s.trim()).filter(Boolean)];
    }

    // Accept both stage[] (multi-value) and stages (comma-separated)
    let stages = searchParams.getAll('stage');
    const stagesParam = searchParams.get('stages');
    if (stagesParam) {
      stages = [...stages, ...stagesParam.split(',').map(s => s.trim()).filter(Boolean)];
    }

    // Deduplicate
    industries = [...new Set(industries)];
    stages = [...new Set(stages)];

    // Admin bypass: admins can see all companies regardless of score
    let isAdmin = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .maybeSingle();
        isAdmin = profile?.is_admin === true;
      }
    } catch {
      // Non-auth or lookup failure — treat as non-admin
    }

    let query = supabase
      .from('company_pages')
      .select(
        'id, company_name, slug, description, one_liner, industry, stage, overall_score, raise_amount, country, headquarters, logo_url, created_at, is_raising, raising_amount, raising_instrument, raising_target_close',
        { count: 'exact' }
      )
      .eq('is_public', true);

    // KUN-21: Only show companies with Kunfa Score >= 75 to non-admins
    if (!isAdmin) {
      query = query.gte('overall_score', 75);
    }

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

    // Currently raising filter
    if (raisingOnly) {
      query = query.eq('is_raising', true);
    }

    // Sorting
    if (sort === 'raising') {
      query = query
        .order('is_raising', { ascending: false, nullsFirst: false })
        .order('raising_target_close', { ascending: true, nullsFirst: false })
        .order('overall_score', { ascending: false, nullsFirst: false });
    } else if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      // Default: score (highest first)
      query = query.order('overall_score', { ascending: false, nullsFirst: false });
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
