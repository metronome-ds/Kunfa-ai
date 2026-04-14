'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Tag, Plus, Copy, Check } from 'lucide-react'

interface PromoCode {
  id: string
  code: string
  tier: string
  duration_days: number
  max_uses: number | null
  times_used: number
  is_active: boolean
  expires_at: string | null
  notes: string | null
  created_at: string
}

const TIERS = ['starter', 'growth', 'scale', 'pro', 'fund', 'enterprise']

const TIER_COLORS: Record<string, string> = {
  starter: 'bg-blue-100 text-blue-700',
  growth: 'bg-emerald-100 text-emerald-700',
  scale: 'bg-violet-100 text-violet-700',
  pro: 'bg-orange-100 text-orange-700',
  fund: 'bg-pink-100 text-pink-700',
  enterprise: 'bg-gray-800 text-white',
}

export default function AdminPromoCodesPage() {
  const router = useRouter()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create form state
  const [newCode, setNewCode] = useState('')
  const [newTier, setNewTier] = useState('growth')
  const [newDuration, setNewDuration] = useState('30')
  const [newMaxUses, setNewMaxUses] = useState('')
  const [newExpiresAt, setNewExpiresAt] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/promo-codes')
    if (res.ok) {
      const data = await res.json()
      setCodes(data.codes || [])
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
      fetchCodes()
    }
    checkAccess()
  }, [router, fetchCodes])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreateLoading(true)

    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          tier: newTier,
          durationDays: parseInt(newDuration),
          maxUses: newMaxUses ? parseInt(newMaxUses) : null,
          expiresAt: newExpiresAt || null,
          notes: newNotes || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create promo code.')
        setCreateLoading(false)
        return
      }

      // Reset form and refresh
      setNewCode('')
      setNewTier('growth')
      setNewDuration('30')
      setNewMaxUses('')
      setNewExpiresAt('')
      setNewNotes('')
      setShowCreateForm(false)
      fetchCodes()
    } catch {
      setCreateError('Something went wrong.')
    }
    setCreateLoading(false)
  }

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    setActionLoading(id)
    await fetch(`/api/admin/promo-codes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentlyActive }),
    })
    fetchCodes()
    setActionLoading(null)
  }

  function handleCopy(code: string, id: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-[#007CF8]" />
          <h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] transition"
        >
          <Plus className="w-4 h-4" />
          Create Code
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Promo Code</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  required
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] uppercase tracking-wider"
                  placeholder="LAUNCH2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                >
                  {TIERS.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  required
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses <span className="text-gray-400">(optional)</span></label>
                <input
                  type="number"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At <span className="text-gray-400">(optional)</span></label>
                <input
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                  placeholder="For batch 1 investors"
                />
              </div>
            </div>

            {createError && (
              <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{createError}</div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-[#007CF8] rounded-lg hover:bg-[#0066D6] transition disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create Promo Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#007CF8]" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No promo codes yet. Create your first one.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-[#F8F9FB]">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Uses</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((pc) => (
                  <tr key={pc.id} className="border-b border-gray-100 hover:bg-[#F8F9FB]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-semibold text-gray-900">{pc.code}</code>
                        <button
                          onClick={() => handleCopy(pc.code, pc.id)}
                          className="text-gray-400 hover:text-gray-600 transition"
                          title="Copy code"
                        >
                          {copiedId === pc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TIER_COLORS[pc.tier] || 'bg-gray-100 text-gray-700'}`}>
                        {pc.tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{pc.duration_days}d</td>
                    <td className="px-4 py-3 text-gray-600">
                      {pc.times_used}{pc.max_uses ? ` / ${pc.max_uses}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {pc.expires_at ? new Date(pc.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">
                      {pc.notes || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        pc.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {pc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleActive(pc.id, pc.is_active)}
                        disabled={actionLoading === pc.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                          pc.is_active
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {pc.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
