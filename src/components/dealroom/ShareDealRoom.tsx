'use client'

import { useState, useEffect, useCallback } from 'react'
import { Share2, Copy, Check, Trash2, Eye, Link2, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface ShareLink {
  id: string
  token: string
  expires_at: string | null
  allow_download: boolean
  is_active: boolean
  view_count: number
  last_viewed_at: string | null
  created_at: string
}

interface ShareDealRoomProps {
  companyId: string
  companyName: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function ShareDealRoom({ companyId, companyName }: ShareDealRoomProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create link form
  const [password, setPassword] = useState('')
  const [expiryDays, setExpiryDays] = useState('')
  const [allowDownload, setAllowDownload] = useState(true)

  // New link result
  const [newLink, setNewLink] = useState<{ token: string } | null>(null)

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dealroom/${companyId}/share`)
      if (res.ok) {
        const data = await res.json()
        setLinks(data.links || [])
      }
    } catch (err) {
      console.error('Failed to fetch links:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (isOpen) fetchLinks()
  }, [isOpen, fetchLinks])

  const createLink = async () => {
    setCreating(true)
    setError('')
    try {
      const res = await fetch(`/api/dealroom/${companyId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password || undefined,
          expires_in_days: expiryDays ? parseInt(expiryDays) : undefined,
          allow_download: allowDownload,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create link')
      }

      const data = await res.json()
      setNewLink({ token: data.token })
      setPassword('')
      setExpiryDays('')
      setAllowDownload(true)
      fetchLinks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link')
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (linkId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/dealroom/links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      })
      if (res.ok) {
        setLinks(prev => prev.map(l => l.id === linkId ? { ...l, is_active: !currentActive } : l))
      }
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  const deleteLink = async (linkId: string) => {
    if (!confirm('Delete this share link?')) return
    try {
      const res = await fetch(`/api/dealroom/links/${linkId}`, { method: 'DELETE' })
      if (res.ok) {
        setLinks(prev => prev.filter(l => l.id !== linkId))
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const copyLink = (token: string, linkId: string) => {
    const url = `${window.location.origin}/room/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(linkId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const roomUrl = newLink ? `${typeof window !== 'undefined' ? window.location.origin : ''}/room/${newLink.token}` : ''

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setNewLink(null); setError('') }}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Share Deal Room</h3>
          <p className="text-sm text-gray-500 mb-6">{companyName}</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* New link created */}
          {newLink && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-emerald-700 mb-2">Link created!</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={roomUrl}
                  className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm text-gray-700 font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(roomUrl)
                    setCopiedId('new')
                    setTimeout(() => setCopiedId(null), 2000)
                  }}
                  className="px-3 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition flex items-center gap-1"
                >
                  {copiedId === 'new' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedId === 'new' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button
                onClick={() => setNewLink(null)}
                className="text-xs text-emerald-600 hover:underline mt-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Create new link */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Create New Link</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password (optional)</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank for no password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expires in (days)</label>
                  <input
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    placeholder="Never"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Allow downloads</label>
                  <button
                    onClick={() => setAllowDownload(!allowDownload)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
                  >
                    {allowDownload ? (
                      <ToggleRight className="w-5 h-5 text-[#007CF8]" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={allowDownload ? 'text-gray-900' : 'text-gray-500'}>
                      {allowDownload ? 'Yes' : 'No'}
                    </span>
                  </button>
                </div>
              </div>
              <button
                onClick={createLink}
                disabled={creating}
                className="w-full py-2.5 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Generate Share Link'}
              </button>
            </div>
          </div>

          {/* Existing links */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Shared Links</h4>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#007CF8]" />
              </div>
            ) : links.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No shared links yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {links.map(link => {
                  const isExpired = link.expires_at && new Date(link.expires_at) < new Date()
                  return (
                    <div
                      key={link.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        !link.is_active || isExpired
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-600 truncate">
                          /room/{link.token.slice(0, 12)}...
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {link.view_count} view{link.view_count !== 1 ? 's' : ''}
                          </span>
                          <span>{timeAgo(link.created_at)}</span>
                          {link.expires_at && (
                            <span className={isExpired ? 'text-red-400' : ''}>
                              {isExpired ? 'Expired' : `Expires ${new Date(link.expires_at).toLocaleDateString()}`}
                            </span>
                          )}
                          {!link.is_active && <span className="text-red-400">Inactive</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyLink(link.token, link.id)}
                          className="p-1.5 text-gray-400 hover:text-[#007CF8] transition"
                          title="Copy link"
                        >
                          {copiedId === link.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a
                          href={`/room/${link.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-[#007CF8] transition"
                          title="Preview"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => toggleActive(link.id, link.is_active)}
                          className="p-1.5 text-gray-400 hover:text-amber-500 transition"
                          title={link.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {link.is_active ? (
                            <ToggleRight className="w-4 h-4 text-[#007CF8]" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition"
                          title="Delete link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
