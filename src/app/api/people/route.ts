import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/people
 * List users/people with search and role filter
 * Query params:
 * - search: search by name, company, headline
 * - role: filter by role (founder, investor, service_provider, etc.)
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // Build query for public profile data only
    let query = supabase
      .from('users')
      .select(
        `
        id,
        full_name,
        email,
        headline,
        company,
        location,
        avatar_url,
        role,
        interests,
        created_at
      `,
        { count: 'exact' }
      );

    // Apply role filter
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // Apply search
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,company.ilike.%${search}%,headline.ilike.%${search}%`
      );
    }

    // Order by newest first
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: people, error, count } = await query;

    if (error) {
      console.error('Error fetching people:', error);
      return NextResponse.json(
        { error: 'Failed to fetch people' },
        { status: 500 }
      );
    }

    // Return only public profile data
    const publicPeople = (people || []).map(person => ({
      id: person.id,
      full_name: person.full_name,
      headline: person.headline,
      company: person.company,
      location: person.location,
      avatar_url: person.avatar_url,
      role: person.role,
      interests: person.interests || [],
      created_at: person.created_at,
    }));

    return NextResponse.json(
      {
        data: publicPeople,
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
    console.error('Unexpected error in GET /api/people:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
