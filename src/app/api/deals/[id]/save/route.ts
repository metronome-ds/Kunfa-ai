import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/deals/[id]/save
 * Save a deal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

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

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_deals')
      .select('id')
      .eq('user_id', user.id)
      .eq('deal_id', id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Deal already saved' },
        { status: 400 }
      );
    }

    // Save deal
    const { data, error } = await supabase
      .from('saved_deals')
      .insert({
        user_id: user.id,
        deal_id: id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving deal:', error);
      return NextResponse.json(
        { error: 'Failed to save deal' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, message: 'Deal saved successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/deals/[id]/save:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/deals/[id]/save
 * Unsave a deal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

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
      .from('saved_deals')
      .delete()
      .eq('user_id', user.id)
      .eq('deal_id', id);

    if (error) {
      console.error('Error unsaving deal:', error);
      return NextResponse.json(
        { error: 'Failed to unsave deal' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Deal unsaved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/deals/[id]/save:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
