import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/portfolio/[id]
 * Update holding (current valuation, status, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const resolvedParams = await params;

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
    const { current_valuation, status, exit_type, exit_date, exit_amount } = body;

    const updateData: any = {};
    if (current_valuation !== undefined) updateData.current_valuation = current_valuation;
    if (status !== undefined) updateData.status = status;
    if (exit_type !== undefined) updateData.exit_type = exit_type;
    if (exit_date !== undefined) updateData.exit_date = exit_date;
    if (exit_amount !== undefined) updateData.exit_amount = exit_amount;

    const { data, error } = await supabase
      .from('portfolio_holdings')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .eq('investor_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating holding:', error);
      return NextResponse.json(
        { error: 'Failed to update holding' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Holding not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in PUT /api/portfolio/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/portfolio/[id]
 * Remove holding
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const resolvedParams = await params;

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

    const { error } = await supabase
      .from('portfolio_holdings')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('investor_id', user.id);

    if (error) {
      console.error('Error deleting holding:', error);
      return NextResponse.json(
        { error: 'Failed to delete holding' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Holding removed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/portfolio/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
