import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/deals/[id]/request-meeting
 * Request a meeting with the deal creator
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

    // Get deal info
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('created_by')
      .eq('id', id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Prevent self-messaging
    if (deal.created_by === user.id) {
      return NextResponse.json(
        { error: 'You cannot request a meeting with yourself' },
        { status: 400 }
      );
    }

    // Create meeting request record
    const { data: meetingRequest, error: requestError } = await supabase
      .from('meeting_requests')
      .insert({
        deal_id: id,
        requester_id: user.id,
        recipient_id: deal.created_by,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating meeting request:', requestError);
      return NextResponse.json(
        { error: 'Failed to send meeting request' },
        { status: 500 }
      );
    }

    // TODO: Send notification email to deal creator

    return NextResponse.json(
      { data: meetingRequest, message: 'Meeting request sent' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/deals/[id]/request-meeting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
