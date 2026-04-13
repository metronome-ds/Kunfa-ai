'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3,
  Users,
  Building2,
  Eye,
  Sparkles,
  UserPlus,
  FileText,
  Award,
  TrendingUp,
  Mail,
  ShieldCheck,
  RefreshCw,
  Activity,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { getCurrentUser } from '@/lib/supabase'
import { isSuperAdmin } from '@/lib/super-admins'

// --- Types mirror the shape returned by /api/admin/analytics ---
interface DailyPoint {
  date: string
  investors: number
  startups: number
  total: number
}

interface ScorePoint {
  date: string
  count: number
  avg: number
}

interface MostViewedCompany {
  company_id: string
  company_name: string
  slug: string | null
  views: number
}

interface RecentViewer {
  viewer_email: string
  company_name: string
  slug: string | null
  created_at: string
}

interface ActivityItem {
  id: string
  type: 'signup' | 'score' | 'upload' | 'pipeline' | 'team_invite' | 'claim'
  actor: string
  description: string
  created_at: string
}

interface AnalyticsData {
  generatedAt: string
  users: {
    total: number
    byRole: Record<string, number>
    signupsOverTime: DailyPoint[]
  }
  companies: {
    total: number
    scored: number
    unscored: number
    highScore: number
    avgScore: number
    bySource: Record<string, number>
  }
  dealRoom: {
    views7d: number
    views30d: number
    viewsAllTime: number
    uniqueViewers: number
    mostViewedCompanies: MostViewedCompany[]
    recentViewers: RecentViewer[]
  }
  documents: {
    total: number
    byCategory: Record<string, number>
  }
  scores: {
    total: number
    avg: number
    scoresOverTime: ScorePoint[]
  }
  team: {
    totalInvites: number
    accepted: number
    pending: number
  }
  imports: {
    total: number
    byStatus: Record<string, number>
  }
  recentActivity: ActivityItem[]
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function activityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'signup':
      return <UserPlus className="w-4 h-4 text-emerald-600" />
    case 'score':
      return <Sparkles className="w-4 h-4 text-[#007CF8]" />
    case 'upload':
      return <FileText className="w-4 h-4 text-amber-600" />
    case 'pipeline':
      return <TrendingUp className="w-4 h-4 text-purple-600" />
    case 'team_invite':
      return <Mail className="w-4 h-4 text-cyan-600" />
    case 'claim':
      return <Award className="w-4 h-4 text-rose-600" />
    default:
      return <Activity className="w-4 h-4 text-gray-500" />
  }
}

function sourceLabel(src: string): string {
  return src
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchAnalytics = useCallback(async (isInitial: boolean) => {
    if (isInitial) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/admin/analytics', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      const json = (await res.json()) as AnalyticsData
      setData(json)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }
      if (!isSuperAdmin(user.email)) {
        router.push('/dashboard')
        return
      }
      fetchAnalytics(true)
    }
    init()
  }, [router, fetchAnalytics])

  // Auto-refresh every 60s
  useEffect(() => {
    if (!data) return
    const id = setInterval(() => fetchAnalytics(false), 60_000)
    return () => clearInterval(id)
  }, [data, fetchAnalytics])

  const sourceRows = useMemo(() => {
    if (!data) return []
    return Object.entries(data.companies.bySource)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({
        key,
        label: sourceLabel(key),
        value,
        pct: data.companies.total > 0 ? Math.round((value / data.companies.total) * 100) : 0,
      }))
  }, [data])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <h2 className="font-semibold mb-1">Failed to load analytics</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const investorCount = data.users.byRole.investor ?? 0
  const startupCount = data.users.byRole.startup ?? 0

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#007CF8]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Last updated {formatRelative(data.generatedAt)} · auto-refreshes every 60s
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchAnalytics(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-[#F8F9FB] transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Row 1 — Key metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={<Users className="w-5 h-5" />}
          label="Total Users"
          value={data.users.total}
          breakdown={`${investorCount} investors · ${startupCount} startups`}
          accent="blue"
        />
        <MetricCard
          icon={<Building2 className="w-5 h-5" />}
          label="Total Companies"
          value={data.companies.total}
          breakdown={`${data.companies.scored} scored · ${data.companies.unscored} unscored`}
          accent="emerald"
        />
        <MetricCard
          icon={<Eye className="w-5 h-5" />}
          label="Deal Room Views (7d)"
          value={data.dealRoom.views7d}
          breakdown={`${data.dealRoom.uniqueViewers} unique viewers all-time`}
          accent="purple"
        />
        <MetricCard
          icon={<Sparkles className="w-5 h-5" />}
          label="Scores Generated"
          value={data.scores.total}
          breakdown={data.scores.avg > 0 ? `avg ${data.scores.avg}` : 'no data'}
          accent="amber"
        />
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card title="Signups (last 30 days)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.users.signupsOverTime.map(p => ({ ...p, date: formatShortDate(p.date) }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="investors"
                  stroke="#007CF8"
                  strokeWidth={2}
                  dot={false}
                  name="Investors"
                />
                <Line
                  type="monotone"
                  dataKey="startups"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Startups"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Scores generated (last 30 days)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.scores.scoresOverTime.map(p => ({ ...p, date: formatShortDate(p.date) }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#007CF8" radius={[4, 4, 0, 0]} name="Scores" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3 — Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card title="Most viewed companies">
          {data.dealRoom.mostViewedCompanies.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 text-center">No views yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.dealRoom.mostViewedCompanies.map((c, idx) => (
                <div key={c.company_id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-medium text-gray-400 w-4">{idx + 1}</span>
                    {c.slug ? (
                      <Link
                        href={`/company/${c.slug}`}
                        className="text-sm text-gray-900 hover:text-[#007CF8] truncate"
                      >
                        {c.company_name}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-900 truncate">{c.company_name}</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                    {c.views} {c.views === 1 ? 'view' : 'views'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent deal room viewers">
          {data.dealRoom.recentViewers.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 text-center">No viewers yet</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {data.dealRoom.recentViewers.map((v, idx) => (
                <div key={`${v.viewer_email}-${idx}`} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 truncate max-w-[60%]">{v.viewer_email}</span>
                    <span className="text-xs text-gray-400">{formatRelative(v.created_at)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    viewed{' '}
                    {v.slug ? (
                      <Link href={`/company/${v.slug}`} className="text-[#007CF8] hover:underline">
                        {v.company_name}
                      </Link>
                    ) : (
                      <span>{v.company_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 4 — Activity feed */}
      <Card title="Recent activity" className="mb-8">
        {data.recentActivity.length === 0 ? (
          <div className="text-sm text-gray-400 py-8 text-center">No recent activity</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.recentActivity.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-full bg-[#F8F9FB] flex items-center justify-center flex-shrink-0">
                  {activityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    <span className="font-medium">{item.actor}</span>{' '}
                    <span className="text-gray-600">{item.description}</span>
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatRelative(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Row 5 — Platform health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Companies by source">
          {sourceRows.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 text-center">No companies</div>
          ) : (
            <div className="space-y-3">
              {sourceRows.map(row => (
                <div key={row.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{row.label}</span>
                    <span className="text-xs font-medium text-gray-900">
                      {row.value} <span className="text-gray-400">({row.pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#007CF8] rounded-full"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Team invites">
          <div className="space-y-4">
            <StatRow label="Total invites" value={data.team.totalInvites} />
            <StatRow label="Accepted" value={data.team.accepted} accent="emerald" />
            <StatRow label="Pending" value={data.team.pending} accent="amber" />
            {data.team.totalInvites > 0 && (
              <div className="pt-2">
                <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(data.team.accepted / data.team.totalInvites) * 100}%` }}
                  />
                  <div
                    className="bg-amber-400"
                    style={{ width: `${(data.team.pending / data.team.totalInvites) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Import pipeline">
          <div className="space-y-3">
            <StatRow label="Raw" value={data.imports.byStatus.raw ?? 0} />
            <StatRow label="Cleaned" value={data.imports.byStatus.cleaned ?? 0} accent="blue" />
            <StatRow label="Promoted" value={data.imports.byStatus.promoted ?? 0} accent="emerald" />
            <StatRow label="Rejected" value={data.imports.byStatus.rejected ?? 0} accent="red" />
          </div>
        </Card>
      </div>
    </div>
  )
}

// --- Helper components ---

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: number
  breakdown: string
  accent: 'blue' | 'emerald' | 'purple' | 'amber'
}

function MetricCard({ icon, label, value, breakdown, accent }: MetricCardProps) {
  const accentClasses = {
    blue: 'bg-blue-50 text-[#007CF8]',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  }[accent]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentClasses}`}>
          {icon}
        </div>
        <BarChart3 className="w-4 h-4 text-gray-300" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      <div className="text-[11px] text-gray-400 mt-2">{breakdown}</div>
    </div>
  )
}

interface CardProps {
  title: string
  children: React.ReactNode
  className?: string
}

function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

interface StatRowProps {
  label: string
  value: number
  accent?: 'emerald' | 'amber' | 'blue' | 'red'
}

function StatRow({ label, value, accent }: StatRowProps) {
  const valueClass = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    blue: 'text-[#007CF8]',
    red: 'text-red-600',
  }[accent ?? 'blue']

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-sm font-semibold ${accent ? valueClass : 'text-gray-900'}`}>
        {value.toLocaleString()}
      </span>
    </div>
  )
}
