import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/services
 * List services with filters
 * Query params:
 * - type: filter by service type (legal, accounting, hr, compliance, consulting)
 * - search: search by provider name or title
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;

    const serviceType = searchParams.get('type');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // Build query
    let query = supabase
      .from('services')
      .select(
        `
        id,
        provider_id,
        title,
        description,
        service_type,
        hourly_rate,
        expertise_areas,
        certifications,
        created_at,
        updated_at
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (serviceType) {
      query = query.eq('service_type', serviceType);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Order by newest first
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: services, error, count } = await query;

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: services || [],
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
    console.error('Unexpected error in GET /api/services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services
 * Create a service listing
 * Required fields: title, description, service_type, hourly_rate, expertise_areas
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
    const { title, description, service_type, hourly_rate, expertise_areas, certifications } = body;

    // Validate required fields
    if (!title || !description || !service_type || hourly_rate === undefined || !expertise_areas) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Create service listing
    const { data: service, error: createError } = await supabase
      .from('services')
      .insert({
        provider_id: userProfile.id,
        title,
        description,
        service_type,
        hourly_rate: parseFloat(hourly_rate),
        expertise_areas: Array.isArray(expertise_areas) ? expertise_areas : [expertise_areas],
        certifications: certifications || [],
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating service:', createError);
      return NextResponse.json(
        { error: 'Failed to create service listing' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: service, message: 'Service listing created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
