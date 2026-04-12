import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabase } from '@/lib/db';
import { getTeamContext } from '@/lib/team-context';
import { NextResponse } from 'next/server';

/**
 * GET /api/profile
 * Returns the current user's profile data for the settings form.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabase();

    const { data: profile, error } = await db
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get team context to determine effective role and company
    const teamCtx = await getTeamContext(user.id, db);

    return NextResponse.json({
      profile: {
        ...profile,
        email: user.email,
      },
      teamContext: {
        isTeamMember: teamCtx.isTeamMember,
        memberRole: teamCtx.memberRole,
        effectiveRole: teamCtx.effectiveRole,
        companyName: teamCtx.companyName,
      },
    });
  } catch (err) {
    console.error('GET /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Profile fields that can be updated
const PROFILE_FIELDS = [
  'full_name', 'linkedin_url', 'job_title',
  // Startup fields
  'company_name', 'one_liner', 'industry', 'company_stage',
  'company_website', 'company_country', 'team_size',
  // Investor fields
  'fund_name', 'aum', 'ticket_size_min', 'ticket_size_max',
  'stage_focus', 'sector_interests', 'geo_focus', 'investment_thesis',
];

// Map from profile column → company_pages column
const COMPANY_SYNC_MAP: Record<string, string> = {
  company_name: 'company_name',
  one_liner: 'one_liner',
  company_stage: 'stage',
  company_website: 'website_url',
  company_country: 'country',
  team_size: 'team_size',
  linkedin_url: 'linkedin_url',
  industry: 'industry',
};

/**
 * PATCH /api/profile
 * Updates user profile and syncs relevant fields to company_pages for startups.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const db = getSupabase();

    // Build profile updates (only whitelisted fields)
    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of PROFILE_FIELDS) {
      if (field in body) {
        const val = body[field];
        if (field === 'team_size' || field === 'aum' || field === 'ticket_size_min' || field === 'ticket_size_max') {
          profileUpdates[field] = val ? Number(val) : null;
        } else {
          profileUpdates[field] = val || null;
        }
      }
    }

    // Update the profile
    const { data: updatedProfile, error: updateError } = await db
      .from('profiles')
      .update(profileUpdates)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // Sync to company_pages for startup users
    const role = updatedProfile?.role;
    const isStartup = role === 'startup' || role === 'founder';

    if (isStartup) {
      const teamCtx = await getTeamContext(user.id, db);

      // Only sync if user is owner or admin
      const canSync = teamCtx.memberRole === 'owner' || teamCtx.memberRole === 'admin';

      if (canSync) {
        // Find the company page to sync to
        const { data: companyPage } = await db
          .from('company_pages')
          .select('id')
          .eq('user_id', teamCtx.effectiveUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (companyPage) {
          const companyUpdates: Record<string, unknown> = {};
          let hasCompanyUpdates = false;

          for (const [profileField, companyField] of Object.entries(COMPANY_SYNC_MAP)) {
            if (profileField in body) {
              const val = body[profileField];
              if (profileField === 'team_size') {
                companyUpdates[companyField] = val ? Number(val) : null;
              } else {
                companyUpdates[companyField] = val || null;
              }
              hasCompanyUpdates = true;
            }
          }

          if (hasCompanyUpdates) {
            const { error: companyError } = await db
              .from('company_pages')
              .update(companyUpdates)
              .eq('id', companyPage.id);

            if (companyError) {
              console.error('Company sync error:', companyError);
              // Don't fail the whole request — profile was already updated
            }
          }
        }
      }
    }

    return NextResponse.json({
      profile: {
        ...updatedProfile,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('PATCH /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
