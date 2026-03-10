import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabase } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * DELETE /api/account
 * Permanently delete user account and all associated data
 */
export async function DELETE() {
  try {
    const authClient = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const sb = getSupabase(); // service role — bypasses RLS

    // Look up profile id (used as investor_id in watchlist_items, team_id in team_members)
    const { data: profile } = await sb
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const profileId = profile?.id;

    // Delete in order to respect foreign keys
    if (profileId) {
      await sb.from('watchlist_items').delete().eq('investor_id', profileId);
      await sb.from('team_members').delete().eq('team_id', profileId);
    }
    await sb.from('team_members').delete().eq('member_user_id', userId);
    await sb.from('portfolio').delete().eq('investor_user_id', userId);
    await sb.from('deals').delete().eq('created_by', userId);
    await sb.from('notifications').delete().eq('user_id', userId);
    await sb.from('company_pages').delete().eq('user_id', userId);
    await sb.from('submissions').delete().eq('user_id', userId);
    await sb.from('profiles').delete().eq('user_id', userId);

    // Delete the auth user
    const { error: deleteError } = await sb.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Account deleted' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
