'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { tenantFetch } from '@/lib/tenant-fetch'

interface DeleteCompanyModalProps {
  companyId: string
  companyName: string
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
}

export function DeleteCompanyModal({
  companyId,
  companyName,
  isOpen,
  onClose,
  onDeleted,
}: DeleteCompanyModalProps) {
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = confirmation.trim().toLowerCase() === companyName.trim().toLowerCase()

  const handleDelete = async () => {
    if (!confirmed) return
    setDeleting(true)
    setError(null)
    try {
      const res = await tenantFetch(`/api/companies/${companyId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || `Delete failed (status ${res.status})`)
        setDeleting(false)
        return
      }
      onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-bold">Delete Company</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <strong>{companyName}</strong>? This will remove it
            from the deal flow and cannot be easily undone.
          </p>

          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs text-red-700">
              All associated deals, watchlist entries, and pipeline data will be removed. The
              company will no longer appear in search or browse.
            </p>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">
              Type <strong>{companyName}</strong> to confirm
            </span>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={companyName}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
              autoFocus
            />
          </label>

          {error && (
            <div className="text-sm text-red-700 p-2.5 rounded bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleDelete}
              disabled={!confirmed || deleting}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleting ? 'Deleting…' : 'Delete Company'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
