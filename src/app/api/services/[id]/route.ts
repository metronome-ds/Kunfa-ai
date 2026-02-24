import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/services/[id]
 * Get service detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const resolvedParams = await params;

    const { data: service, error } = await supabase
      .from('services_listings')
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
        updated_at,
        users!services_listings_provider_id_fkey(
          id,
          user_id,
          full_name,
          avatar_url,
          headline,
          company
        )
      `
      )
      .eq('id', resolvedParams.id)
      .single();

    if (error) {
      console.error('Error fetching service:', error);
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: service },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/services/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/services/[id]
 * Update service listing
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const resolvedParams = await params;

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

    // Get service
    const { data: service } = await supabase
      .from('services_listings')
      .select('provider_id, users!services_listings_provider_id_fkey(user_id)')
      .eq('id', resolvedParams.id)
      .single() as any;

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const serviceUser = Array.isArray(service.users) ? service.users[0] : service.users;
    if (!serviceUser || serviceUser.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, service_type, hourly_rate, expertise_areas, certifications } = body;

    // Update service
    const { data: updated, error } = await supabase
      .from('services_listings')
      .update({
        ...(title && { title }),
        ...(description && { description }),
        ...(service_type && { service_type }),
        ...(hourly_rate !== undefined && { hourly_rate: parseFloat(hourly_rate) }),
        ...(expertise_areas && { expertise_areas: Array.isArray(expertise_areas) ? expertise_areas : [expertise_areas] }),
        ...(certifications && { certifications }),
      })
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      return NextResponse.json(
        { error: 'Failed to update service' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: updated, message: 'Service updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in PUT /api/services/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/[id]
 * Delete service listing
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const resolvedParams = await params;

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

    // Get service
    const { data: service } = await supabase
      .from('services_listings')
      .select('provider_id, users!services_listings_provider_id_fkey(user_id)')
      .eq('id', resolvedParams.id)
      .single() as any;

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const serviceUser = Array.isArray(service.users) ? service.users[0] : service.users;
    if (!serviceUser || serviceUser.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete service
    const { error } = await supabase
      .from('services_listings')
      .delete()
      .eq('id', resolvedParams.id);

    if (error) {
      console.error('Error deleting service:', error);
      return NextResponse.json(
        { error: 'Failed to delete service' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Service deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/services/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
