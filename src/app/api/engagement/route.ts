import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface UserEngagementMetrics {
  deals_viewed: number;
  deals_saved: number;
  connections_made: number;
  deals_posted: number;
  documents_uploaded: number;
}

/**
 * GET /api/engagement
 * Get user's engagement score
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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

    // Get engagement metrics
    const { data: engagement, error } = await supabase
      .from('user_engagement')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching engagement:', error);
      return NextResponse.json(
        { error: 'Failed to fetch engagement' },
        { status: 500 }
      );
    }

    // Calculate engagement score (0-1000 scale)
    const metrics: UserEngagementMetrics = engagement || {
      deals_viewed: 0,
      deals_saved: 0,
      connections_made: 0,
      deals_posted: 0,
      documents_uploaded: 0,
    };

    const score =
      (metrics.deals_viewed * 10) +
      (metrics.deals_saved * 20) +
      (metrics.connections_made * 30) +
      (metrics.deals_posted * 50) +
      (metrics.documents_uploaded * 25);

    // Cap at 1000
    const engagementScore = Math.min(score, 1000);

    return NextResponse.json(
      {
        data: {
          ...metrics,
          score: engagementScore,
          breakdown: {
            deals_viewed: { count: metrics.deals_viewed, weight: 10 },
            deals_saved: { count: metrics.deals_saved, weight: 20 },
            connections_made: { count: metrics.connections_made, weight: 30 },
            deals_posted: { count: metrics.deals_posted, weight: 50 },
            documents_uploaded: { count: metrics.documents_uploaded, weight: 25 },
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/engagement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/engagement
 * Increment an engagement metric
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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
    const { metric } = body;

    const validMetrics = [
      'deals_viewed',
      'deals_saved',
      'connections_made',
      'deals_posted',
      'documents_uploaded',
    ];

    if (!metric || !validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` },
        { status: 400 }
      );
    }

    // Get or create engagement record
    let { data: engagement, error } = await supabase
      .from('user_engagement')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Create new engagement record
      const { data: newEngagement, error: createError } = await supabase
        .from('user_engagement')
        .insert({
          user_id: user.id,
          deals_viewed: metric === 'deals_viewed' ? 1 : 0,
          deals_saved: metric === 'deals_saved' ? 1 : 0,
          connections_made: metric === 'connections_made' ? 1 : 0,
          deals_posted: metric === 'deals_posted' ? 1 : 0,
          documents_uploaded: metric === 'documents_uploaded' ? 1 : 0,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating engagement record:', createError);
        return NextResponse.json(
          { error: 'Failed to create engagement record' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { data: newEngagement, message: 'Engagement metric incremented' },
        { status: 200 }
      );
    } else if (error) {
      console.error('Error fetching engagement:', error);
      return NextResponse.json(
        { error: 'Failed to fetch engagement' },
        { status: 500 }
      );
    }

    // Increment metric
    const updateData: any = {};
    updateData[metric] = (engagement?.[metric as keyof typeof engagement] || 0) + 1;

    const { data: updated, error: updateError } = await supabase
      .from('user_engagement')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating engagement:', updateError);
      return NextResponse.json(
        { error: 'Failed to update engagement' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: updated, message: 'Engagement metric incremented' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/engagement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
