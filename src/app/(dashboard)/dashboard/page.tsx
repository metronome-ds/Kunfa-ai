'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TopDeals } from '@/components/dashboard/TopDeals';
import { PipelineSummary } from '@/components/dashboard/PipelineSummary';
import { MarketPulse } from '@/components/dashboard/MarketPulse';
import { UserRole, PipelineStage } from '@/lib/types';
import {
  BarChart3,
  Briefcase,
  TrendingUp,
  Zap,
  FileUp,
  Brain,
  Users,
  Settings,
  Compass,
  PieChart,
  Eye,
  Star,
  Clock,
  CheckCircle,
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  company_name?: string;
}

interface DealData {
  id: string;
  company_name: string;
  industry: string;
  stage: string;
  overall_score: number | null;
  funding_amount_requested: number | null;
}

// Map actual DB stages to UI pipeline stages
function mapStageToPipeline(dbStage: string): PipelineStage {
  switch (dbStage) {
    case 'sourced': return 'sourcing';
    case 'screening': return 'screening';
    case 'due_diligence':
    case 'ic_review': return 'diligence';
    case 'term_sheet':
    case 'closed': return 'close';
    default: return 'sourcing';
  }
}

// Transform a raw deal row (with company_pages join) into DealData for the UI
function transformDeal(row: Record<string, unknown>): DealData {
  const company = row.company_pages as Record<string, unknown> | null;
  return {
    id: row.id as string,
    company_name: (company?.company_name as string) || (row.sector as string) || 'Unknown',
    industry: (company?.industry as string) || (row.sector as string) || 'N/A',
    stage: row.stage as string,
    overall_score: (row.ai_score as number | null) ?? (company?.overall_score as number | null) ?? null,
    funding_amount_requested: row.raise_amount as number | null,
  };
}

interface ActivityData {
  id: string;
  title: string;
  description: string;
  icon: 'deal' | 'score' | 'document' | 'pipeline';
  timestamp: string;
  href?: string;
}

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activePipeline: 0,
    savedDeals: 0,
    portfolioValue: 0,
    scoresGenerated: 0,
    myActiveDeals: 0,
    totalViews: 0,
    documentsUploaded: 0,
    averageScore: 0,
  });
  const [topDeals, setTopDeals] = useState<DealData[]>([]);
  const [pipelineData, setPipelineData] = useState<Array<{ stage: PipelineStage; count: number }>>([]);
  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [marketPulse, setMarketPulse] = useState({
    newDealsThisWeek: 0,
    topIndustry: 'B2B SaaS',
    topIndustryCount: 0,
    averageScore: null as number | null,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Load user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);

          // Load role-specific data
          if (profile.role === 'investor') {
            loadInvestorData(user.id);
          } else if (profile.role === 'founder') {
            loadFounderData(user.id);
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const loadInvestorData = async (userId: string) => {
    try {
      // Load watchlisted deals count (replaces saved_deals)
      const { count: savedCount } = await supabase
        .from('watchlist')
        .select('*', { count: 'exact' })
        .eq('investor_id', userId);

      // Load deals with company info for scoring
      const { data: rawDeals } = await supabase
        .from('deals')
        .select(`
          id, created_by, assigned_to, company_id, stage, ai_score, sector,
          raise_amount, priority_flag, is_watchlisted, days_in_stage,
          stage_changed_at, created_at, updated_at,
          company_pages (id, company_name, slug, description, overall_score, industry, logo_url)
        `)
        .order('ai_score', { ascending: false, nullsFirst: false })
        .limit(10);

      const deals: DealData[] = (rawDeals || []).map(transformDeal);

      // Load all deals for pipeline counts
      const { data: allDeals } = await supabase
        .from('deals')
        .select('stage');

      // Map DB stages to UI pipeline stages and count
      const pipelineCounts: Array<{ stage: PipelineStage; count: number }> = [
        { stage: 'sourcing', count: allDeals?.filter((d) => d.stage === 'sourced').length || 0 },
        { stage: 'screening', count: allDeals?.filter((d) => d.stage === 'screening').length || 0 },
        { stage: 'diligence', count: allDeals?.filter((d) => d.stage === 'due_diligence' || d.stage === 'ic_review').length || 0 },
        { stage: 'close', count: allDeals?.filter((d) => d.stage === 'term_sheet' || d.stage === 'closed').length || 0 },
      ];

      // Load portfolio value from funds
      const { data: funds } = await supabase
        .from('funds')
        .select('committed')
        .eq('owner_id', userId);
      const totalPortfolio = funds?.reduce((sum, f) => sum + (Number(f.committed) || 0), 0) || 0;

      setStats({
        activePipeline: allDeals?.length || 0,
        savedDeals: savedCount || 0,
        portfolioValue: totalPortfolio,
        scoresGenerated: deals.filter((d) => d.overall_score !== null).length,
        myActiveDeals: 0,
        totalViews: 0,
        documentsUploaded: 0,
        averageScore: 0,
      });

      setTopDeals(deals.slice(0, 4));
      setPipelineData(pipelineCounts);

      // Load recent notifications as activity
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, title, body, type, link, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const activityItems: ActivityData[] = (notifications || []).map((n) => ({
        id: n.id,
        title: n.title,
        description: n.body || '',
        icon: (n.type === 'score' ? 'score' : n.type === 'pipeline' ? 'pipeline' : n.type === 'document' ? 'document' : 'deal') as ActivityData['icon'],
        timestamp: n.created_at,
        href: n.link || undefined,
      }));

      // Fallback mock activity if no notifications
      if (activityItems.length === 0) {
        activityItems.push(
          { id: '1', title: 'Welcome to Kunfa', description: 'Your deal flow platform is ready', icon: 'deal', timestamp: new Date().toISOString() },
        );
      }

      setActivity(activityItems);

      // Market pulse data
      const { count: recentCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const scores = deals.filter((d) => d.overall_score !== null).map((d) => d.overall_score!);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

      // Find top sector
      const sectorCounts: Record<string, number> = {};
      deals.forEach((d) => { if (d.industry) sectorCounts[d.industry] = (sectorCounts[d.industry] || 0) + 1; });
      const topSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];

      setMarketPulse({
        newDealsThisWeek: recentCount || 0,
        topIndustry: topSector?.[0] || 'N/A',
        topIndustryCount: topSector?.[1] || 0,
        averageScore: avgScore,
      });
    } catch (error) {
      console.error('Failed to load investor data:', error);
    }
  };

  const loadFounderData = async (userId: string) => {
    try {
      // Load founder's deals (deals assigned to them or where their company is referenced)
      const { data: rawDeals } = await supabase
        .from('deals')
        .select(`
          id, created_by, assigned_to, company_id, stage, ai_score, sector,
          raise_amount, priority_flag, is_watchlisted, days_in_stage,
          stage_changed_at, created_at, updated_at,
          company_pages (id, company_name, slug, description, overall_score, industry, logo_url)
        `)
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      const myDeals = (rawDeals || []).map(transformDeal);

      // Load document views for founder's companies
      const { data: companyPages } = await supabase
        .from('company_pages')
        .select('id')
        .eq('user_id', userId);

      const companyIds = (companyPages || []).map(c => c.id);
      let viewCount = 0;
      if (companyIds.length > 0) {
        const { count } = await supabase
          .from('document_views')
          .select('*', { count: 'exact' })
          .in('company_id', companyIds);
        viewCount = count || 0;
      }

      const scoredDeals = myDeals.filter((d) => d.overall_score !== null);
      const avgScore = scoredDeals.length > 0
        ? scoredDeals.reduce((sum, d) => sum + (d.overall_score || 0), 0) / scoredDeals.length
        : 0;

      setStats({
        activePipeline: 0,
        savedDeals: 0,
        portfolioValue: 0,
        scoresGenerated: scoredDeals.length,
        myActiveDeals: myDeals.length,
        totalViews: viewCount,
        documentsUploaded: 0,
        averageScore: avgScore,
      });

      setTopDeals(myDeals.slice(0, 4));

      // Load notifications as activity
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, title, body, type, link, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const activityItems: ActivityData[] = (notifications || []).map((n) => ({
        id: n.id,
        title: n.title,
        description: n.body || '',
        icon: (n.type === 'score' ? 'score' : n.type === 'document' ? 'document' : 'deal') as ActivityData['icon'],
        timestamp: n.created_at,
        href: n.link || undefined,
      }));

      if (activityItems.length === 0) {
        activityItems.push(
          { id: '1', title: 'Welcome to Kunfa', description: 'Set up your company profile to get started', icon: 'deal', timestamp: new Date().toISOString() },
        );
      }

      setActivity(activityItems);
    } catch (error) {
      console.error('Failed to load founder data:', error);
    }
  };

  const investorQuickActions = [
    {
      title: 'Browse Deals',
      description: 'Discover new investment opportunities',
      icon: Compass,
      href: '/deals',
      color: 'blue' as const,
    },
    {
      title: 'View Pipeline',
      description: 'Track deals through your pipeline stages',
      icon: TrendingUp,
      href: '/pipeline',
      color: 'purple' as const,
    },
    {
      title: 'View Portfolio',
      description: 'Monitor your active investments',
      icon: PieChart,
      href: '/portfolio',
      color: 'green' as const,
    },
    {
      title: 'AI Tools',
      description: 'Score deals, generate briefs, analyze terms',
      icon: Brain,
      href: '/deals',
      color: 'indigo' as const,
    },
  ];

  const founderQuickActions = [
    {
      title: 'Create Deal',
      description: 'Pitch your company to investors',
      icon: Briefcase,
      href: '/deals/create',
      color: 'blue' as const,
    },
    {
      title: 'View My Deals',
      description: 'See all your fundraising deals',
      icon: Eye,
      href: '/deals/my-deals',
      color: 'purple' as const,
    },
    {
      title: 'Upload Documents',
      description: 'Share pitch decks and financials',
      icon: FileUp,
      href: '/deals/create',
      color: 'green' as const,
    },
    {
      title: 'Get AI Score',
      description: 'Get AI analysis of your deal',
      icon: Star,
      href: '/deals',
      color: 'indigo' as const,
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deal':
        return Briefcase;
      case 'score':
        return Brain;
      case 'document':
        return FileUp;
      case 'pipeline':
        return TrendingUp;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: string): 'blue' | 'green' | 'purple' | 'orange' => {
    switch (type) {
      case 'deal':
        return 'blue';
      case 'score':
        return 'purple';
      case 'document':
        return 'green';
      case 'pipeline':
        return 'orange';
      default:
        return 'blue';
    }
  };

  const isInvestor = userProfile?.role === 'investor';
  const isFounder = userProfile?.role === 'founder';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome back, {userProfile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-2">
          {isInvestor
            ? 'Manage your deal pipeline and discover new investment opportunities'
            : isFounder
              ? 'Track your fundraising progress and investor engagement'
              : 'Your deal flow intelligence platform is ready to use'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {isInvestor ? (
          <>
            <StatsCard
              label="Active Pipeline"
              value={stats.activePipeline}
              icon={TrendingUp}
              color="blue"
              isLoading={isLoading}
            />
            <StatsCard
              label="Saved Deals"
              value={stats.savedDeals}
              icon={BarChart3}
              color="green"
              isLoading={isLoading}
            />
            <StatsCard
              label="Portfolio Value"
              value={stats.portfolioValue > 0 ? `$${(stats.portfolioValue / 1_000_000).toFixed(1)}M` : '$0'}
              icon={PieChart}
              color="purple"
              isLoading={isLoading}
            />
            <StatsCard
              label="AI Scores Generated"
              value={stats.scoresGenerated}
              icon={Brain}
              color="indigo"
              isLoading={isLoading}
            />
          </>
        ) : (
          <>
            <StatsCard
              label="My Active Deals"
              value={stats.myActiveDeals}
              icon={Briefcase}
              color="blue"
              isLoading={isLoading}
            />
            <StatsCard
              label="Total Views"
              value={stats.totalViews}
              icon={Eye}
              color="green"
              isLoading={isLoading}
            />
            <StatsCard
              label="Documents Uploaded"
              value={stats.documentsUploaded}
              icon={FileUp}
              color="purple"
              isLoading={isLoading}
            />
            <StatsCard
              label="Average AI Score"
              value={stats.averageScore > 0 ? stats.averageScore.toFixed(1) : '—'}
              icon={Brain}
              color="indigo"
              isLoading={isLoading}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <QuickActions
          actions={isInvestor ? investorQuickActions : founderQuickActions}
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column: Activity Feed */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <RecentActivity
              items={activity.map((item) => ({
                id: item.id,
                icon: getActivityIcon(item.icon),
                title: item.title,
                description: item.description,
                timestamp: item.timestamp,
                href: item.href,
                color: getActivityColor(item.icon),
              }))}
              isLoading={isLoading}
              emptyMessage="No recent activity yet"
            />
          </div>
        </div>

        {/* Right Column: Market Pulse */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Market Pulse</h2>
            <MarketPulse
              newDealsThisWeek={marketPulse.newDealsThisWeek}
              topIndustry={marketPulse.topIndustry}
              topIndustryCount={marketPulse.topIndustryCount}
              averageScore={marketPulse.averageScore}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Deals */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {isInvestor ? 'Top Scored Deals' : 'My Latest Deals'}
            </h2>
            <TopDeals
              deals={topDeals}
              isLoading={isLoading}
              emptyMessage={isInvestor ? 'No scored deals yet' : 'No deals created yet'}
            />
          </div>
        </div>

        {/* Pipeline Summary */}
        {isInvestor && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Summary</h2>
              <PipelineSummary counts={pipelineData} isLoading={isLoading} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
