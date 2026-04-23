'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Send, Loader2, Check, Trash2, Eye, Clock, AlertCircle } from 'lucide-react'

interface ShareInvitation {
  id: string
  recipient_email: string
  recipient_name: string | null
  is_active: boolean
  view_count: number
  last_viewed_at: string | null
  created_at: string
  expires_at: string
}

interface ShareProfileModalProps {
  companyId: string
  companyName: string
  isOpen: boolean
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function ShareProfileModal({ companyId, companyName, isOpen, onClose }: ShareProfileModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [includeDealRoom, setIncludeDealRoom] = useState(true)
  const [includeScore, setIncludeScore] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [shares, setShares] = useState<ShareInvitation[]>([])
  const [loadingShares, setLoadingShares] = useState(false)

  const loadShares = useCallback(async () => {
    setLoadingShares(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/share`)
      if (res.ok) {
        const d = await res.json()
        setShares(d.data || [])
      }
    } finally {
      setLoadingShares(false)
    }
  }, [companyId])

  useEffect(() => {
    if (isOpen) loadShares()
  }, [isOpen, loadShares])

  const handleSend = async () => {
    if (!email.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/companies/${companyId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email.trim(),
          recipientName: name.trim() || null,
          message: message.trim() || null,
          includeDealRoom,
          includeScore,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Failed to send')
        setSending(false)
        return
      }
      setSent(true)
      setEmail('')
      setName('')
      setMessage('')
      loadShares()
      setTimeout(() => setSent(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const revoke = async (invitationId: string) => {
    try {
      await fetch(`/api/companies/${companyId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })
      loadShares()
    } catch { /* ignore */ }
  }

  if (!isOpen) return null

  const inputClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-lg font-bold text-gray-900">Share Profile</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Send form */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Share <strong>{companyName}</strong>&apos;s profile and deal room with an investor or advisor.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recipient email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="investor@fund.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recipient name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith (optional)" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Add a note for the recipient</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Hi — I'd love to share our latest deck with you…" className={inputClass + ' resize-none'} />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={includeDealRoom} onChange={(e) => setIncludeDealRoom(e.target.checked)} className="rounded border-gray-300" />
                Include Deal Room access
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={includeScore} onChange={(e) => setIncludeScore(e.target.checked)} className="rounded border-gray-300" />
                Include Kunfa Score
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {sent && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                <Check className="w-4 h-4" /> Invitation sent
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-[#007CF8] text-white rounded-lg font-semibold text-sm hover:bg-[#0066D6] transition disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send Invitation'}
            </button>
          </div>

          {/* Share history */}
          {(shares.length > 0 || loadingShares) && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Shared with</h3>
              {loadingShares ? (
                <div className="py-4 text-center"><Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto" /></div>
              ) : (
                <div className="space-y-2">
                  {shares.map((s) => {
                    const expired = new Date(s.expires_at) < new Date()
                    const revoked = !s.is_active
                    return (
                      <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${revoked || expired ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {s.recipient_name || s.recipient_email}
                          </p>
                          {s.recipient_name && (
                            <p className="text-xs text-gray-500 truncate">{s.recipient_email}</p>
                          )}
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                            <span>{timeAgo(s.created_at)}</span>
                            {s.view_count > 0 && (
                              <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{s.view_count} view{s.view_count !== 1 ? 's' : ''}</span>
                            )}
                            {expired && <span className="text-amber-600"><Clock className="w-3 h-3 inline" /> Expired</span>}
                            {revoked && <span className="text-red-500">Revoked</span>}
                          </div>
                        </div>
                        {s.is_active && !expired && (
                          <button
                            onClick={() => revoke(s.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition rounded"
                            title="Revoke access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
