'use client'

import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, Lock, Mail } from 'lucide-react'

interface PublicDoc {
  id: string
  file_name: string
  file_type: string
  file_size: number
  category: string
  description: string | null
  is_public: boolean
}

interface LockedDealRoomProps {
  companyId: string
  companyName: string
  onUnlock: (sessionId: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  pitch_deck: 'Pitch Deck',
  financials: 'Financials',
  cap_table: 'Cap Table',
  legal: 'Legal',
  term_sheet: 'Term Sheet',
  due_diligence: 'Due Diligence',
  product: 'Product',
  other: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  pitch_deck: 'bg-blue-100 text-blue-700',
  financials: 'bg-emerald-100 text-emerald-700',
  cap_table: 'bg-purple-100 text-purple-700',
  legal: 'bg-amber-100 text-amber-700',
  term_sheet: 'bg-rose-100 text-rose-700',
  due_diligence: 'bg-cyan-100 text-cyan-700',
  product: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return '📄'
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return '📊'
  if (fileType.includes('presentation') || fileType.includes('powerpoint') || fileType.includes('keynote')) return '📑'
  if (fileType.includes('word') || fileType.includes('document')) return '📝'
  return '📎'
}

function formatFileSize(bytes: number) {
  if (!bytes || bytes === 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LockedDealRoom({ companyId, companyName, onUnlock }: LockedDealRoomProps) {
  const [docs, setDocs] = useState<PublicDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/dealroom/${companyId}`)
      if (res.ok) {
        const data = await res.json()
        const publicDocs = (data.documents || []).filter((d: PublicDoc) => d.is_public)
        setDocs(publicDocs)
      }
    } catch (err) {
      console.error('Failed to fetch public docs:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/dealroom/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, companyId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unlock')
      }
      // Persist session for return visits
      try {
        localStorage.setItem(`kunfa_dealroom_${companyId}`, data.sessionId)
        localStorage.setItem(`kunfa_dealroom_email_${companyId}`, email)
      } catch {
        // ignore localStorage errors
      }
      onUnlock(data.sessionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock deal room. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div id="deal-room" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0168FE]/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-[#0168FE]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Deal Room</h2>
            <p className="text-xs text-gray-500">
              {loading ? 'Loading...' : `${docs.length} document${docs.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Blurred document list */}
      <div className="relative">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0168FE]" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No documents in the deal room yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pointer-events-none select-none filter blur-[2px] opacity-70">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{getFileIcon(doc.file_type)}</span>
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other}`}>
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </span>
                    {doc.file_size > 0 && (
                      <span className="text-[10px] text-gray-400">{formatFileSize(doc.file_size)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email gate overlay */}
        {!loading && docs.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#0168FE]/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-[#0168FE]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Enter your email to access the deal room</h3>
                  <p className="text-xs text-gray-500 mt-0.5">View {companyName}&apos;s documents</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@fund.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
                    required
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#0168FE] text-white hover:bg-[#0050CC] transition disabled:opacity-50"
                >
                  {submitting ? 'Unlocking...' : 'View Documents'}
                </button>
                <p className="text-[11px] text-gray-400 text-center">
                  By unlocking, you agree to share your email with the startup.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
