'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  Brain,
  FileUp,
  Users,
  Compass,
  PieChart,
  Eye,
  Star,
  Clock,
  ExternalLink,
  RefreshCw,
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
  one_liner?: string;
  industry?: string;
  company_stage?: string;
  company_country?: string;
  company_website?: string;
  linkedin_url?: string;
  team_size?: number;
  job_title?: string;
}

interface CompanyData {
  id: string;
  slug: string;
  company_name: string;
  overall_score: number | null;
  one_liner: string | null;
  industry: string | null;
  stage: string | null;
  description: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  raise_amount: number | null;
  team_size: number | null;
  founded_year: number | null;
  use_of_funds: string | null;
  traction: string | null;
  submission_id: string | null;
  created_at: string;
}

interface DealData {
  id: string;
  company_name: string;
  industry: string;
  stage: string;
  overall_score: number | null;
  funding_amount_requested: number | null;
}

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

function getScoreColor(score: number | null) {
  if (!score) return 'text-gray-400';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBg(score: number | null) {
  if (!score) return 'bg-gray-50 border-gray-200';
  if (score >= 80) return 'bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'bg-blue-50 border-blue-200';
  if (score >= 40) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartup, setIsStartup] = useState(false);

  // Startup-specific state
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [paid, setPaid] = useState(false);

  // Investor-specific state
  const [stats, setStats] = useState({
    activePipeline: 0,
    savedDeals: 0,
    portfolioValue: 0,
    scoresGenerated: 0,
  });
  const [topDeals, setTopDeals] = useState<DealData[]>([]);
  const [pipelineData, setPipelineData] = useState<Array<{ stage: PipelineStage; count: number }>>([]);
  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [marketPulse, setMarketPulse] = useState({
    newDealsThisWeek: 0,
    topIndustry: 'N/A',
    topIndustryCount: 0,
    averageScore: null as number | null,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
          const startup = profile.role === 'founder' || profile.role === 'startup';
          setIsStartup(startup);

          if (startup) {
            loadStartupData(user.id);
          } else {
            loadInvestorData(user.id);
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

  const loadStartupData = async (userId: string) => {
    try {
      const res = await fetch('/api/my-company');
      const data = await res.json();
      setCompany(data.company || null);
      setPaid(!!data.paid);
    } catch {
      // ignore
    }
  };

  const loadInvestorData = async (userId: string) => {
    try {
      const { count: savedCount } = await supabase
        .from('watchlist_items')
        .select('*', { count: 'exact' })
        .eq('investor_id', userId);

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

      const { data: allDeals } = await supabase
        .from('deals')
        .select('stage');

      const pipelineCounts: Array<{ stage: PipelineStage; count: number }> = [
        { stage: 'sourcing', count: allDeals?.filter((d) => d.stage === 'sourced').length || 0 },
        { stage: 'screening', count: allDeals?.filter((d) => d.stage === 'screening').length || 0 },
        { stage: 'diligence', count: allDeals?.filter((d) => d.stage === 'due_diligence' || d.stage === 'ic_review').length || 0 },
        { stage: 'close', count: allDeals?.filter((d) => d.stage === 'term_sheet' || d.stage === 'closed').length || 0 },
      ];

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
      });

      setTopDeals(deals.slice(0, 4));
      setPipelineData(pipelineCounts);

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

      if (activityItems.length === 0) {
        activityItems.push(
          { id: '1', title: 'Welcome to Kunfa', description: 'Your deal flow platform is ready', icon: 'deal', timestamp: new Date().toISOString() },
        );
      }

      setActivity(activityItems);

      const { count: recentCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const scores = deals.filter((d) => d.overall_score !== null).map((d) => d.overall_score!);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

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

  const investorQuickActions = [
    { title: 'Browse Companies', description: 'Discover new investment opportunities', icon: Compass, href: '/deals', color: 'blue' as const },
    { title: 'View Pipeline', description: 'Track deals through your pipeline', icon: TrendingUp, href: '/pipeline', color: 'purple' as const },
    { title: 'Add Company', description: 'Add a company to your pipeline', icon: Briefcase, href: '/companies/new', color: 'green' as const },
    { title: 'Saved Deals', description: 'View your watchlisted companies', icon: Star, href: '/saved-deals', color: 'indigo' as const },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deal': return Briefcase;
      case 'score': return Brain;
      case 'document': return FileUp;
      case 'pipeline': return TrendingUp;
      default: return Clock;
    }
  };

  const getActivityColor = (type: string): 'blue' | 'green' | 'purple' | 'orange' => {
    switch (type) {
      case 'deal': return 'blue';
      case 'score': return 'purple';
      case 'document': return 'green';
      case 'pipeline': return 'orange';
      default: return 'blue';
    }
  };

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

  // ─── STARTUP DASHBOARD ───────────────────────────────────
  if (isStartup) {
    const scored = company?.created_at ? daysSince(company.created_at) : null;

    // Profile completeness
    const profileFields = company ? [
      company.company_name,
      company.one_liner,
      company.description,
      company.industry,
      company.stage,
      company.website_url,
      company.linkedin_url,
      company.raise_amount,
      company.team_size,
      company.traction,
      company.use_of_funds,
    ] : [];
    const filledFields = profileFields.filter(Boolean).length;
    const totalFields = profileFields.length;
    const completeness = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

    return (
      <div className="p-8 max-w-4xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-gray-500 mt-1">Manage your startup profile and track your investment readiness.</p>
        </div>

        {company ? (
          <>
            {/* Score + Company Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex items-start gap-6">
                {/* Score Badge */}
                <div className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center flex-shrink-0 ${getScoreBg(company.overall_score)}`}>
                  <span className={`text-4xl font-bold ${getScoreColor(company.overall_score)}`}>
                    {company.overall_score ?? '—'}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">/ 100</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">{company.company_name}</h2>
                  {company.one_liner && (
                    <p className="text-gray-500 text-sm mt-1">{company.one_liner}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {company.industry && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        {company.industry}
                      </span>
                    )}
                    {company.stage && (
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                        {company.stage}
                      </span>
                    )}
                    {scored !== null && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                        Scored {scored}d ago
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link
                    href={`/company/${company.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0168FE] text-white rounded-lg text-sm font-medium hover:bg-[#0050CC] transition"
                  >
                    View Public Profile
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/company-profile"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Manage Profile
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-[#0168FE]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Kunfa Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(company.overall_score)}`}>
                      {company.overall_score ?? '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Days Since Scored</p>
                    <p className="text-2xl font-bold text-gray-900">{scored ?? '—'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Profile Completeness</p>
                    <p className="text-2xl font-bold text-gray-900">{completeness}%</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Report Status */}
            {company.submission_id && (
              <div className={`rounded-xl p-5 mb-6 border ${
                paid ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }`}>
                {paid ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Kunfa Readiness Report</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Your full AI-powered investment analysis is ready.</p>
                    </div>
                    <Link
                      href={`/report/${company.submission_id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#0168FE] text-white rounded-lg text-sm font-medium hover:bg-[#0050CC] transition"
                    >
                      View Report
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Unlock Your Full Readiness Report</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Detailed analysis, sector benchmarks, and actionable recommendations.</p>
                    </div>
                    <Link
                      href={`/report/${company.submission_id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
                    >
                      Unlock Report — $59
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Edit Profile', href: '/company-profile', icon: '✏️' },
                { label: 'Data Room', href: '/data-room', icon: '📁' },
                { label: 'Find Investors', href: '/investors', icon: '🔍' },
                { label: 'Score Details', href: company.submission_id ? `/score/${company.submission_id}` : '#', icon: '📊' },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gray-300 hover:shadow transition text-center"
                >
                  <span className="text-2xl mb-2 block">{link.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{link.label}</span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          /* No company page — CTA */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Get Your Kunfa Score</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Upload your pitch deck to get your AI-powered investment readiness score and create your company profile.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0168FE] text-white rounded-lg font-semibold text-sm hover:bg-[#0050CC] transition"
            >
              Get Your Kunfa Score
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ─── INVESTOR DASHBOARD ──────────────────────────────────
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome back{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your deal pipeline and discover new investment opportunities
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard label="Active Pipeline" value={stats.activePipeline} icon={TrendingUp} color="blue" isLoading={isLoading} />
        <StatsCard label="Saved Deals" value={stats.savedDeals} icon={BarChart3} color="green" isLoading={isLoading} />
        <StatsCard label="Portfolio Value" value={stats.portfolioValue > 0 ? `$${(stats.portfolioValue / 1_000_000).toFixed(1)}M` : '$0'} icon={PieChart} color="purple" isLoading={isLoading} />
        <StatsCard label="AI Scores Generated" value={stats.scoresGenerated} icon={Brain} color="indigo" isLoading={isLoading} />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <QuickActions actions={investorQuickActions} isLoading={isLoading} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
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
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Scored Deals</h2>
            <TopDeals deals={topDeals} isLoading={isLoading} emptyMessage="No scored deals yet" />
          </div>
        </div>
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Summary</h2>
            <PipelineSummary counts={pipelineData} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
