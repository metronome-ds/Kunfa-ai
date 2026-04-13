'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Sparkles, ArrowUpCircle, X, RefreshCw } from 'lucide-react'

interface ImportRecord {
  id: string
  raw_name: string
  clean_name: string | null
  raw_source: string
  status: string
  raw_country: string | null
  clean_country: string | null
  raw_sector: string | null
  clean_sector: string | null
  batch_id: string | null
  rejection_reason: string | null
  imported_at: string
}

interface Stats {
  total: number
  raw: number
  cleaned: number
  promoted: number
  rejected: number
  duplicate: number
}

type StatusFilter = 'all' | 'raw' | 'cleaned' | 'promoted' | 'rejected' | 'duplicate'

export default function AdminImportsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<ImportRecord[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, raw: 0, cleaned: 0, promoted: 0, rejected: 0, duplicate: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const fetchData = useCallback(async (status: StatusFilter) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/imports?status=${status}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setRecords(data.records || [])
      }
    } catch (err) {
      console.error('Failed to fetch imports:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    async function checkAccess() {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      if (!profile?.is_admin) { router.push('/dashboard'); return }
      fetchData(activeTab)
    }
    checkAccess()
  }, [router, activeTab, fetchData])

  async function handleCleanBatch() {
    setActionLoading('clean')
    try {
      const res = await fetch('/api/admin/import/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Cleaned: ${data.cleaned}, Rejected: ${data.rejected}`)
        fetchData(activeTab)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Failed to clean batch')
    }
    setActionLoading(null)
  }

  async function handlePromoteCleaned() {
    setActionLoading('promote')
    try {
      const res = await fetch('/api/admin/import/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Promoted: ${data.promoted}, Duplicates: ${data.duplicates}`)
        fetchData(activeTab)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Failed to promote')
    }
    setActionLoading(null)
  }

  async function handleReject(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/imports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejection_reason: rejectionReason || 'Manually rejected' }),
      })
      if (res.ok) {
        setRejectingId(null)
        setRejectionReason('')
        fetchData(activeTab)
      }
    } catch {
      alert('Failed to reject')
    }
    setActionLoading(null)
  }

  function switchTab(tab: StatusFilter) {
    setActiveTab(tab)
    fetchData(tab)
  }

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'raw', label: 'Raw', count: stats.raw },
    { key: 'cleaned', label: 'Cleaned', count: stats.cleaned },
    { key: 'promoted', label: 'Promoted', count: stats.promoted },
    { key: 'rejected', label: 'Rejected', count: stats.rejected },
    { key: 'duplicate', label: 'Duplicate', count: stats.duplicate },
  ]

  const statusColors: Record<string, string> = {
    raw: 'bg-gray-100 text-gray-700',
    cleaned: 'bg-blue-50 text-blue-700',
    promoted: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    duplicate: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#007CF8]" />
          <h1 className="text-2xl font-bold text-gray-900">Company Imports</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanBatch}
            disabled={actionLoading === 'clean' || stats.raw === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
          >
            {actionLoading === 'clean' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Clean Batch ({stats.raw})
          </button>
          <button
            onClick={handlePromoteCleaned}
            disabled={actionLoading === 'promote' || stats.cleaned === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
          >
            {actionLoading === 'promote' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="w-4 h-4" />
            )}
            Promote Cleaned ({stats.cleaned})
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {tabs.map(tab => (
          <div key={tab.key} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{tab.count}</p>
            <p className="text-xs text-gray-500 mt-1">{tab.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#007CF8]" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No {activeTab === 'all' ? '' : activeTab} imports found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-[#F8F9FB]">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Country</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sector</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Batch</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} className="border-b border-gray-100 hover:bg-[#F8F9FB]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{rec.clean_name || rec.raw_name}</p>
                    {rec.rejection_reason && (
                      <p className="text-xs text-red-500 mt-0.5">{rec.rejection_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{rec.raw_source}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[rec.status] || 'bg-gray-100 text-gray-600'}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{rec.clean_country || rec.raw_country || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{rec.clean_sector || rec.raw_sector || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{rec.batch_id || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {(rec.status === 'raw' || rec.status === 'cleaned') && (
                      <button
                        onClick={() => setRejectingId(rec.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition"
                      >
                        <X className="w-3 h-3" />
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rejection reason modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rejection Reason</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Optional reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRejectingId(null); setRejectionReason('') }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                disabled={actionLoading === rejectingId}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                Reject Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
