'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Check, X } from 'lucide-react'

interface ClaimRequest {
  id: string
  company_id: string
  requester_email: string
  requester_name: string | null
  status: string
  rejection_reason: string | null
  created_at: string
  company_pages: {
    company_name: string
    website_url: string | null
    slug: string
  }
}

type TabFilter = 'pending' | 'approved' | 'rejected'

export default function AdminClaimsPage() {
  const router = useRouter()
  const [claims, setClaims] = useState<ClaimRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabFilter>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const fetchClaims = useCallback(async (status: TabFilter) => {
    setLoading(true)
    const res = await fetch(`/api/admin/claims?status=${status}`)
    if (res.ok) {
      const data = await res.json()
      setClaims(data.claims || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Check admin access
    async function checkAccess() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/dashboard')
        return
      }

      fetchClaims(activeTab)
    }

    checkAccess()
  }, [router, activeTab, fetchClaims])

  async function handleApprove(id: string) {
    setActionLoading(id)
    const res = await fetch(`/api/admin/claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    if (res.ok) {
      fetchClaims(activeTab)
    }
    setActionLoading(null)
  }

  async function handleReject(id: string) {
    setActionLoading(id)
    const res = await fetch(`/api/admin/claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejection_reason: rejectionReason }),
    })
    if (res.ok) {
      setRejectingId(null)
      setRejectionReason('')
      fetchClaims(activeTab)
    }
    setActionLoading(null)
  }

  function switchTab(tab: TabFilter) {
    setActiveTab(tab)
    fetchClaims(tab)
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="w-6 h-6 text-[#0168FE]" />
        <h1 className="text-2xl font-bold text-gray-900">Claim Requests</h1>
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
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0168FE]" />
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No {activeTab} claim requests.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Requester</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Website</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                {activeTab === 'pending' && (
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/company/${claim.company_pages.slug}`}
                      className="text-[#0168FE] hover:underline font-medium"
                    >
                      {claim.company_pages.company_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{claim.requester_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{claim.requester_email}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {claim.company_pages.website_url
                      ? claim.company_pages.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(claim.created_at).toLocaleDateString()}
                  </td>
                  {activeTab === 'pending' && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(claim.id)}
                          disabled={actionLoading === claim.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectingId(claim.id)}
                          disabled={actionLoading === claim.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
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
                Reject Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
