import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      role,
      full_name,
      job_title,
      company_name,
      one_liner,
      company_country,
      company_website,
      industry,
      company_stage,
      raise_amount,
    } = body;

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // Build update payload — only include provided fields
    const profileData: Record<string, unknown> = {
      role,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) profileData.full_name = full_name;
    if (job_title !== undefined) profileData.job_title = job_title;
    if (company_name !== undefined) profileData.company_name = company_name;
    if (one_liner !== undefined) profileData.one_liner = one_liner;
    if (company_country !== undefined) profileData.company_country = company_country;
    if (company_website !== undefined) profileData.company_website = company_website;
    if (industry !== undefined) profileData.industry = industry;
    if (company_stage !== undefined) profileData.company_stage = company_stage;
    if (raise_amount !== undefined) profileData.raise_amount = raise_amount;

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile during onboarding:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    } else {
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          ...profileData,
        });

      if (error) {
        console.error('Error creating profile during onboarding:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: 'Onboarding completed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in onboarding route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
