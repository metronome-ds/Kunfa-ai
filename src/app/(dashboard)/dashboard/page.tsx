'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/lib/types';
import {
  TrendingUp,
  Bookmark,
  DollarSign,
  Brain,
  Star,
  Clock,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  PlusCircle,
  Compass,
  ArrowRight,
  Search,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import NotesTimeline from '@/components/pipeline/NotesTimeline';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  fund_name?: string;
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

// ── Investor types ──

interface InvestorStats {
  pipelineDeals: number;
  watchlisted: number;
  totalPipelineValue: number;
  avgKunfaScore: number | null;
}

interface StageCounts {
  sourced: number;
  screening: number;
  due_diligence: number;
  term_sheet: number;
  closed: number;
}

interface TopDeal {
  id: string;
  company_name: string;
  slug: string | null;
  score: number | null;
  stage: string;
  raise_amount: number | null;
  days_in_stage: number;
}

interface PipelineDeal {
  id: string;
  company_id: string;
  company_name: string;
  slug: string | null;
  score: number | null;
  stage: string;
  raise_amount: number | null;
  assigned_to_name: string | null;
  next_action: string | null;
  next_action_date: string | null;
  note_count: number;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  href?: string;
}

// ── Helpers ──

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

function getScoreBadgeColor(score: number | null) {
  if (!score) return 'bg-gray-100 text-gray-500';
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-blue-100 text-blue-700';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function formatCompact(n: number | null): string {
  if (!n) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatStageLabel(stage: string): string {
  const map: Record<string, string> = {
    sourced: 'Sourced',
    screening: 'Screening',
    due_diligence: 'Due Diligence',
    term_sheet: 'Term Sheet',
    closed: 'Closed',
  };
  return map[stage] || stage;
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const STAGE_COLORS: Record<string, string> = {
  sourced: 'bg-gray-400',
  screening: 'bg-blue-500',
  due_diligence: 'bg-purple-500',
  term_sheet: 'bg-amber-500',
  closed: 'bg-emerald-500',
};

// ── Main Component ──

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartup, setIsStartup] = useState(false);

  // Startup state
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [paid, setPaid] = useState(false);
  const [hasReport, setHasReport] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Investor state
  const [investorStats, setInvestorStats] = useState<InvestorStats>({ pipelineDeals: 0, watchlisted: 0, totalPipelineValue: 0, avgKunfaScore: null });
  const [stageCounts, setStageCounts] = useState<StageCounts>({ sourced: 0, screening: 0, due_diligence: 0, term_sheet: 0, closed: 0 });
  const [topDeals, setTopDeals] = useState<TopDeal[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [allDealsFlat, setAllDealsFlat] = useState<PipelineDeal[]>([]);
  const [allDealsByStage, setAllDealsByStage] = useState<Record<string, { company_name: string; slug: string | null }[]>>({});
  const [hoveredStage, setHoveredStage] = useState<{ stage: string; x: number; y: number } | null>(null);
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineSort, setPipelineSort] = useState<{ key: string; asc: boolean }>({ key: 'company_name', asc: true });
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
        if (profile) {
          setUserProfile(profile);
          const startup = profile.role === 'founder' || profile.role === 'startup';
          setIsStartup(startup);
          if (startup) {
            loadStartupData();
          } else {
            setCurrentUserId(user.id);
            loadInvestorData(user.id);
          }
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const loadStartupData = async () => {
    try {
      const res = await fetch('/api/my-company');
      const data = await res.json();
      setCompany(data.company || null);
      setPaid(!!data.paid);
      setHasReport(!!data.hasReport);
    } catch { /* ignore */ }
  };

  const loadInvestorData = async (userId: string) => {
    try {
      // Fetch pipeline data
      const pipelineRes = await fetch('/api/pipeline');
      const pipelineData = pipelineRes.ok ? await pipelineRes.json() : { deals: {}, watchlist: [] };
      const allDeals = pipelineData.deals || {};
      const watchlistCount = (pipelineData.watchlist || []).length;

      // Compute stage counts + total value + scores
      const counts: StageCounts = { sourced: 0, screening: 0, due_diligence: 0, term_sheet: 0, closed: 0 };
      let totalValue = 0;
      const scores: number[] = [];
      const allDealsList: TopDeal[] = [];
      const flatDeals: PipelineDeal[] = [];
      const byStage: Record<string, { company_name: string; slug: string | null }[]> = {};

      for (const [stage, deals] of Object.entries(allDeals) as [string, any[]][]) {
        counts[stage as keyof StageCounts] = deals.length;
        byStage[stage] = [];
        for (const d of deals) {
          if (d.raise_amount) totalValue += Number(d.raise_amount);
          if (d.ai_score) scores.push(d.ai_score);
          allDealsList.push({
            id: d.id,
            company_name: d.company_name,
            slug: d.slug,
            score: d.ai_score,
            stage,
            raise_amount: d.raise_amount,
            days_in_stage: d.days_in_stage || 0,
          });
          flatDeals.push({
            id: d.id,
            company_id: d.company_id,
            company_name: d.company_name,
            slug: d.slug,
            score: d.ai_score,
            stage,
            raise_amount: d.raise_amount,
            assigned_to_name: d.assigned_to_name || null,
            next_action: d.next_action || null,
            next_action_date: d.next_action_date || null,
            note_count: d.note_count || 0,
          });
          byStage[stage].push({ company_name: d.company_name, slug: d.slug });
        }
      }

      const totalDeals = Object.values(counts).reduce((a, b) => a + b, 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

      setInvestorStats({ pipelineDeals: totalDeals, watchlisted: watchlistCount, totalPipelineValue: totalValue, avgKunfaScore: avgScore });
      setStageCounts(counts);

      // Top 5 deals by score
      const sorted = allDealsList.filter(d => d.score !== null).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);
      setTopDeals(sorted);

      // Recent activity: from deals (created_at, stage_changed_at) + notifications
      const activityItems: ActivityItem[] = [];

      for (const deals of Object.values(allDeals) as any[][]) {
        for (const d of deals) {
          activityItems.push({
            id: `deal-created-${d.id}`,
            text: `Added ${d.company_name} to pipeline`,
            time: d.created_at || d.stage_changed_at || new Date().toISOString(),
            href: d.slug ? `/company/${d.slug}` : undefined,
          });
          if (d.stage_changed_at && d.stage !== 'sourced') {
            activityItems.push({
              id: `deal-stage-${d.id}`,
              text: `Moved ${d.company_name} to ${formatStageLabel(d.stage)}`,
              time: d.stage_changed_at,
              href: d.slug ? `/company/${d.slug}` : undefined,
            });
          }
        }
      }

      // Sort by time, take latest 10
      activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(activityItems.slice(0, 10));
      setAllDealsFlat(flatDeals);
      setAllDealsByStage(byStage);
    } catch (err) {
      console.error('Failed to load investor data:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0168FE] mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── STARTUP DASHBOARD ───────────────────────────────────
  if (isStartup) {
    const scored = company?.created_at ? daysSince(company.created_at) : null;
    const profileFields = company ? [
      company.company_name, company.one_liner, company.description, company.industry,
      company.stage, company.website_url, company.linkedin_url, company.raise_amount,
      company.team_size, company.traction, company.use_of_funds,
    ] : [];
    const filledFields = profileFields.filter(Boolean).length;
    const totalFields = profileFields.length;
    const completeness = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

    return (
      <div className="p-8 max-w-4xl mx-auto">
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
                <div className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center flex-shrink-0 ${getScoreBg(company.overall_score)}`}>
                  <span className={`text-4xl font-bold ${getScoreColor(company.overall_score)}`}>{company.overall_score ?? '—'}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">/ 100</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">{company.company_name}</h2>
                  {company.one_liner && <p className="text-gray-500 text-sm mt-1">{company.one_liner}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {company.industry && <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{company.industry}</span>}
                    {company.stage && <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">{company.stage}</span>}
                    {scored !== null && <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">Scored {scored}d ago</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link href={`/company/${company.slug}`} target="_blank" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0168FE] text-white rounded-lg text-sm font-medium hover:bg-[#0050CC] transition">
                    View Public Profile <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/company-profile" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    <RefreshCw className="w-3.5 h-3.5" /> Manage Profile
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Star className="w-5 h-5 text-[#0168FE]" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">Kunfa Score</p><p className={`text-2xl font-bold ${getScoreColor(company.overall_score)}`}>{company.overall_score ?? '—'}</p></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-blue-600" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">Days Since Scored</p><p className="text-2xl font-bold text-gray-900">{scored ?? '—'}</p></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-purple-600" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">Profile Completeness</p><p className="text-2xl font-bold text-gray-900">{completeness}%</p></div>
                </div>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${completeness}%` }} />
                </div>
              </div>
            </div>

            {/* Report Status */}
            {company.submission_id && (
              <div className={`rounded-xl p-5 mb-6 border ${
                paid && hasReport ? 'bg-emerald-50 border-emerald-200'
                  : paid ? 'bg-blue-50 border-blue-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                {paid && hasReport ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Kunfa Readiness Report</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Your full AI-powered investment analysis is ready.</p>
                    </div>
                    <Link href={`/report/${company.submission_id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0168FE] text-white rounded-lg text-sm font-medium hover:bg-[#0050CC] transition">View Report</Link>
                  </div>
                ) : paid ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-[#0168FE] animate-spin flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Report Generating...</h3>
                        <p className="text-xs text-gray-600 mt-0.5">Your Readiness Report is being prepared. We&apos;ll notify you when it&apos;s ready.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => loadStartupData()}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                    >
                      <RefreshCw className="w-4 h-4" /> Check Status
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Unlock Your Full Readiness Report</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Detailed analysis, sector benchmarks, and actionable recommendations.</p>
                    </div>
                    <button
                      onClick={async () => {
                        setCheckoutLoading(true);
                        try {
                          const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: company.submission_id }) });
                          const data = await res.json();
                          if (data.url) window.location.href = data.url;
                        } catch { /* ignore */ } finally { setCheckoutLoading(false); }
                      }}
                      disabled={checkoutLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#0168FE] text-white rounded-lg text-sm font-medium hover:bg-[#0050CC] transition disabled:opacity-50"
                    >
                      {checkoutLoading ? 'Redirecting...' : 'Unlock Report — $59'}
                    </button>
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
                <Link key={link.label} href={link.href} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gray-300 hover:shadow transition text-center">
                  <span className="text-2xl mb-2 block">{link.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{link.label}</span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Star className="w-8 h-8 text-gray-400" /></div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Get Your Kunfa Score</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">Upload your pitch deck to get your AI-powered investment readiness score and create your company profile.</p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#0168FE] text-white rounded-lg font-semibold text-sm hover:bg-[#0050CC] transition">Get Your Kunfa Score</Link>
          </div>
        )}
      </div>
    );
  }

  // ─── INVESTOR DASHBOARD ──────────────────────────────────
  const totalStageDeals = Object.values(stageCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#0168FE] flex items-center justify-center text-white text-lg font-bold">
            {(userProfile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {userProfile?.fund_name || `${userProfile?.full_name || 'Investor'}'s Dashboard`}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Welcome back{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/companies/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0168FE] text-white rounded-lg text-sm font-semibold hover:bg-[#0050CC] transition">
            <PlusCircle className="w-4 h-4" /> Add Company
          </Link>
          <Link href="/deals" className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
            <Compass className="w-4 h-4" /> Browse Companies
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pipeline Deals</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{investorStats.pipelineDeals}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-100"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Watchlisted</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{investorStats.watchlisted}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-100"><Bookmark className="w-5 h-5 text-amber-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Pipeline Value</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCompact(investorStats.totalPipelineValue)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-100"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Kunfa Score</p>
              <p className={`text-3xl font-bold mt-1 ${getScoreColor(investorStats.avgKunfaScore)}`}>
                {investorStats.avgKunfaScore ?? '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-100"><Brain className="w-5 h-5 text-purple-600" /></div>
          </div>
        </div>
      </div>

      {/* Stage Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Deal Stage Breakdown</h2>
        {totalStageDeals > 0 ? (
          <>
            {/* Horizontal bar with tooltips */}
            <div className="relative">
              <div className="flex h-8 rounded-lg overflow-hidden mb-4">
                {(Object.entries(stageCounts) as [string, number][]).map(([stage, count]) => {
                  if (count === 0) return null;
                  const pct = (count / totalStageDeals) * 100;
                  return (
                    <div
                      key={stage}
                      className={`${STAGE_COLORS[stage]} flex items-center justify-center text-white text-xs font-semibold transition-all cursor-pointer`}
                      style={{ width: `${pct}%` }}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                        const segRect = e.currentTarget.getBoundingClientRect();
                        setHoveredStage({
                          stage,
                          x: segRect.left - rect.left + segRect.width / 2,
                          y: -8,
                        });
                      }}
                      onMouseLeave={() => setHoveredStage(null)}
                    >
                      {pct > 8 ? count : ''}
                    </div>
                  );
                })}
              </div>
              {/* Tooltip */}
              {hoveredStage && allDealsByStage[hoveredStage.stage] && (
                <div
                  className="absolute z-10 bg-white border border-gray-200 shadow-lg rounded-lg p-3 pointer-events-none"
                  style={{
                    left: `${hoveredStage.x}px`,
                    bottom: '100%',
                    transform: 'translateX(-50%)',
                    marginBottom: '4px',
                    minWidth: '160px',
                    maxWidth: '240px',
                  }}
                >
                  <p className="text-xs font-semibold text-gray-900 mb-1.5">{formatStageLabel(hoveredStage.stage)}</p>
                  <ul className="space-y-0.5">
                    {allDealsByStage[hoveredStage.stage].map((d, i) => (
                      <li key={i} className="text-xs text-gray-600 truncate">{d.company_name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4">
              {(Object.entries(stageCounts) as [string, number][]).map(([stage, count]) => (
                <div key={stage} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${STAGE_COLORS[stage]}`} />
                  <span className="text-xs text-gray-600">{formatStageLabel(stage)}</span>
                  <span className="text-xs font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">No deals in pipeline yet. <Link href="/deals" className="text-[#0168FE] hover:underline">Browse companies</Link> to get started.</p>
        )}
      </div>

      {/* Two-column: Top Deals + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Top Deals Table — 3 cols */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Top Deals by Score</h2>
            <Link href="/pipeline" className="text-xs text-[#0168FE] font-medium hover:underline flex items-center gap-1">
              View Pipeline <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {topDeals.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3">Company</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3">Score</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3">Stage</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3">Raise</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map(deal => (
                  <tr key={deal.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition cursor-pointer" onClick={() => { if (deal.slug) window.location.href = `/company/${deal.slug}`; }}>
                    <td className="py-3 pr-3">
                      <span className="text-sm font-medium text-gray-900">{deal.company_name}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreBadgeColor(deal.score)}`}>
                        {deal.score ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="text-xs text-gray-600">{formatStageLabel(deal.stage)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-xs text-gray-600">{deal.raise_amount ? formatCompact(deal.raise_amount) : '—'}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-xs text-gray-400">{deal.days_in_stage}d</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No scored deals yet</p>
            </div>
          )}
        </div>

        {/* Recent Activity — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Recent Activity</h2>
          {activity.length > 0 ? (
            <div className="space-y-1">
              {activity.map(item => (
                <div key={item.id} className="py-2.5 border-b border-gray-50 last:border-0">
                  {item.href ? (
                    <Link href={item.href} className="text-sm text-gray-700 hover:text-[#0168FE] transition">{item.text}</Link>
                  ) : (
                    <p className="text-sm text-gray-700">{item.text}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.time)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No recent activity</p>
              <Link href="/deals" className="text-xs text-[#0168FE] hover:underline mt-2 inline-block">Browse companies to get started</Link>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Deals Table */}
      {allDealsFlat.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pipeline Deals</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                placeholder="Search companies..."
                className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE] w-56"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    { key: 'company_name', label: 'Company', align: 'left' },
                    { key: 'score', label: 'Score', align: 'left' },
                    { key: 'stage', label: 'Stage', align: 'left' },
                    { key: 'raise_amount', label: 'Raise', align: 'right' },
                    { key: 'assigned_to_name', label: 'Assigned', align: 'left' },
                    { key: 'next_action', label: 'Next Action', align: 'left' },
                    { key: 'note_count', label: 'Notes', align: 'center' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`text-${col.align} text-xs font-medium text-gray-400 pb-3 cursor-pointer hover:text-gray-600 transition select-none`}
                      onClick={() =>
                        setPipelineSort((prev) =>
                          prev.key === col.key ? { key: col.key, asc: !prev.asc } : { key: col.key, asc: true }
                        )
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {pipelineSort.key === col.key && (
                          pipelineSort.asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = allDealsFlat.filter((d) =>
                    d.company_name.toLowerCase().includes(pipelineSearch.toLowerCase())
                  );
                  const sorted = [...filtered].sort((a, b) => {
                    const k = pipelineSort.key as keyof PipelineDeal;
                    const av = a[k];
                    const bv = b[k];
                    if (av == null && bv == null) return 0;
                    if (av == null) return 1;
                    if (bv == null) return -1;
                    const cmp = typeof av === 'string'
                      ? av.localeCompare(bv as string)
                      : (av as number) - (bv as number);
                    return pipelineSort.asc ? cmp : -cmp;
                  });
                  return sorted.map((deal) => (
                    <>
                      <tr key={deal.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                        <td className="py-3 pr-3">
                          {deal.slug ? (
                            <Link href={`/company/${deal.slug}`} className="text-sm font-medium text-gray-900 hover:text-[#0168FE] transition">
                              {deal.company_name}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{deal.company_name}</span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreBadgeColor(deal.score)}`}>
                            {deal.score ?? '—'}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded text-white ${STAGE_COLORS[deal.stage] || 'bg-gray-400'}`}>
                            {formatStageLabel(deal.stage)}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <span className="text-xs text-gray-600">{deal.raise_amount ? formatCompact(deal.raise_amount) : '—'}</span>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="text-xs text-gray-600">{deal.assigned_to_name || '—'}</span>
                        </td>
                        <td className="py-3 pr-3">
                          <div>
                            <span className="text-xs text-gray-600">{deal.next_action || '—'}</span>
                            {deal.next_action_date && (
                              <span className="text-[10px] text-gray-400 ml-1">({deal.next_action_date})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => setExpandedDealId(expandedDealId === deal.id ? null : deal.id)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
                              expandedDealId === deal.id
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {deal.note_count > 0 && <span>{deal.note_count}</span>}
                          </button>
                        </td>
                      </tr>
                      {expandedDealId === deal.id && currentUserId && (
                        <tr key={`${deal.id}-notes`}>
                          <td colSpan={7} className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <NotesTimeline dealId={deal.id} currentUserId={currentUserId} />
                          </td>
                        </tr>
                      )}
                    </>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
