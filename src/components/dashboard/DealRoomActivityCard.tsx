'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Eye, FileText, BarChart3, Send } from 'lucide-react'
import InviteInvestorModal from './InviteInvestorModal'

interface AnalyticsResponse {
  stats: {
    uniqueViewersThisWeek: number
    uniqueViewersAllTime: number
    documentViewsThisWeek: number
    documentViewsAllTime: number
    invitesSentAllTime: number
  }
  chart: { date: string; views: number }[]
  recentViewers: {
    email: string
    name: string | null
    fundName: string | null
    firstSeen: string
    lastSeen: string
    documentsViewed: { id: string; name: string }[]
  }[]
}

interface DealRoomActivityCardProps {
  companyId: string
  companyName?: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString()
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DealRoomActivityCard({ companyId, companyName }: DealRoomActivityCardProps) {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dealroom/analytics?companyId=${companyId}`)
      if (!res.ok) {
        setError(true)
        return
      }
      const json = (await res.json()) as AnalyticsResponse
      setData(json)
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-16 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const { stats, chart, recentViewers } = data
  const maxViews = Math.max(...chart.map((c) => c.views), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#007CF8]/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#007CF8]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Deal Room Activity</h2>
            <p className="text-xs text-gray-500">See who&apos;s viewing your deal room</p>
          </div>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition"
        >
          <Send className="w-3.5 h-3.5" />
          Invite Investor
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Viewers / wk</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.uniqueViewersThisWeek}</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Viewers (all)</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.uniqueViewersAllTime}</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Doc views / wk</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.documentViewsThisWeek}</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Doc views (all)</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.documentViewsAllTime}</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Send className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Invites sent</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.invitesSentAllTime}</p>
        </div>
      </div>

      {/* 14-day bar chart */}
      <div className="mb-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Views &mdash; Last 14 Days</p>
        <div className="flex items-end gap-1 h-28">
          {chart.map((day) => {
            const heightPct = (day.views / maxViews) * 100
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full flex items-end h-full">
                  <div
                    className="w-full bg-[#007CF8]/80 hover:bg-[#007CF8] rounded-t transition-all"
                    style={{ height: `${Math.max(heightPct, day.views > 0 ? 8 : 2)}%` }}
                  />
                </div>
                <span className="text-[9px] text-gray-400">{formatShortDate(day.date).split(' ')[1]}</span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                  {formatShortDate(day.date)}: {day.views} view{day.views !== 1 ? 's' : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent viewers */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Recent Viewers</p>
        {recentViewers.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No viewers yet. Share your company profile to start collecting interest.</p>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Viewer</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Documents Viewed</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {recentViewers.slice(0, 10).map((v) => (
                  <tr key={v.email} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {v.name ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">{v.name}</p>
                          <p className="text-xs text-gray-500">
                            {v.fundName ? `${v.fundName} · ` : ''}
                            {v.email}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900">{v.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {v.documentsViewed.length === 0 ? (
                        <span className="text-xs text-gray-400">Unlocked only</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {v.documentsViewed.slice(0, 3).map((d) => (
                            <span
                              key={d.id}
                              className="inline-block text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded truncate max-w-[140px]"
                              title={d.name}
                            >
                              {d.name}
                            </span>
                          ))}
                          {v.documentsViewed.length > 3 && (
                            <span className="text-[10px] text-gray-500">+{v.documentsViewed.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{formatDate(v.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteInvestorModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        companyId={companyId}
        companyName={companyName || 'your company'}
        onInvitesSent={() => fetchData()}
      />
    </div>
  )
}
