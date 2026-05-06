import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/pipeline/[dealId]/notes/[noteId]
 * Edit a note (only the author). Body: { content: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string; noteId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { dealId, noteId } = await params;

    if (!UUID_REGEX.test(dealId) || !UUID_REGEX.test(noteId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Update only if user is the author
    const { data: note, error } = await supabase
      .from('deal_notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .eq('deal_id', dealId)
      .eq('author_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }

    if (!note) {
      return NextResponse.json({ error: 'Note not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ note }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/pipeline/[dealId]/notes/[noteId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/pipeline/[dealId]/notes/[noteId]
 * Delete a note (only the author).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string; noteId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { dealId, noteId } = await params;

    if (!UUID_REGEX.test(dealId) || !UUID_REGEX.test(noteId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete only if user is the author
    const { error } = await supabase
      .from('deal_notes')
      .delete()
      .eq('id', noteId)
      .eq('deal_id', dealId)
      .eq('author_id', user.id);

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Note deleted' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/pipeline/[dealId]/notes/[noteId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
