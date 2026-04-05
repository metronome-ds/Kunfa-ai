'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Upload, Trash2, Filter, X, FolderOpen, MoreVertical, Pencil, RefreshCw, Eye, EyeOff } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ShareDealRoom from './ShareDealRoom'

interface DealRoomDocument {
  id: string
  company_id: string
  uploaded_by: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  category: string
  description: string | null
  is_public: boolean
  created_at: string
  uploaded_by_name: string
}

interface DealRoomProps {
  companyId: string
  companyName: string
  canUpload: boolean
  canShare: boolean
  currentUserId: string | null
  publicOnly?: boolean
  onRequestRescore?: () => void
  sessionId?: string | null
  trackingEnabled?: boolean
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'pitch_deck', label: 'Pitch Deck' },
  { value: 'financials', label: 'Financials' },
  { value: 'cap_table', label: 'Cap Table' },
  { value: 'legal', label: 'Legal' },
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'due_diligence', label: 'Due Diligence' },
  { value: 'investment_memo', label: 'Investment Memo' },
  { value: 'internal_memo', label: 'Internal Memo' },
  { value: 'product', label: 'Product' },
  { value: 'other', label: 'Other' },
]

const UPLOAD_CATEGORIES = CATEGORIES.filter(c => c.value !== 'all')

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    pitch_deck: 'bg-blue-100 text-blue-700',
    financials: 'bg-emerald-100 text-emerald-700',
    cap_table: 'bg-purple-100 text-purple-700',
    legal: 'bg-amber-100 text-amber-700',
    term_sheet: 'bg-rose-100 text-rose-700',
    due_diligence: 'bg-cyan-100 text-cyan-700',
    investment_memo: 'bg-teal-100 text-teal-700',
    internal_memo: 'bg-slate-100 text-slate-700',
    product: 'bg-indigo-100 text-indigo-700',
    other: 'bg-gray-100 text-gray-700',
  }
  return colors[category] || colors.other
}

function getCategoryLabel(category: string) {
  return CATEGORIES.find(c => c.value === category)?.label || category
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

export default function DealRoom({ companyId, companyName, canUpload, canShare, currentUserId, publicOnly = false, onRequestRescore, sessionId = null, trackingEnabled = false }: DealRoomProps) {
  const [documents, setDocuments] = useState<DealRoomDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingDoc, setEditingDoc] = useState<DealRoomDocument | null>(null)
  const [replacingDoc, setReplacingDoc] = useState<DealRoomDocument | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/dealroom/${companyId}`)
      if (res.ok) {
        const data = await res.json()
        let docs = data.documents || []
        if (publicOnly) {
          docs = docs.filter((d: DealRoomDocument) => d.is_public)
        }
        setDocuments(docs)
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId, publicOnly])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpenId) return
    const handleClick = () => setMenuOpenId(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpenId])

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return
    setDeletingId(docId)
    try {
      const res = await fetch(`/api/dealroom/${companyId}/${docId}`, { method: 'DELETE' })
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId))
      }
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePublic = async (doc: DealRoomDocument) => {
    const newPublic = !doc.is_public
    // Optimistic update
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, is_public: newPublic } : d))

    try {
      const res = await fetch(`/api/dealroom/${companyId}/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: newPublic }),
      })
      if (!res.ok) {
        // Revert
        setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, is_public: !newPublic } : d))
      }
    } catch {
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, is_public: !newPublic } : d))
    }
  }

  const handleUploaded = () => {
    setUploadOpen(false)
    fetchDocuments()
    setToast('Document uploaded! Re-score to include it in your Kunfa Score.')
  }

  const trackDocumentView = (docId: string) => {
    if (!trackingEnabled) return
    // Fire-and-forget
    fetch('/api/dealroom/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        companyId,
        documentId: docId,
        accessType: 'document_view',
      }),
    }).catch(() => { /* ignore */ })
  }

  const filtered = filter === 'all' ? documents : documents.filter(d => d.category === filter)
  const activeCounts = CATEGORIES.reduce((acc, c) => {
    acc[c.value] = c.value === 'all' ? documents.length : documents.filter(d => d.category === c.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div id="deal-room" className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Toast */}
      {toast && (
        <div className="mx-6 mt-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <RefreshCw className="w-4 h-4 text-[#0168FE] flex-shrink-0" />
          <p className="text-sm text-blue-800 flex-1">{toast}</p>
          {onRequestRescore && (
            <button
              onClick={() => { setToast(null); onRequestRescore() }}
              className="text-xs font-semibold text-[#0168FE] hover:underline whitespace-nowrap"
            >
              Re-Score Now
            </button>
          )}
          <button onClick={() => setToast(null)} className="text-blue-400 hover:text-blue-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0168FE]/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-[#0168FE]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Deal Room</h2>
              <p className="text-xs text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canShare && (
              <ShareDealRoom companyId={companyId} companyName={companyName} />
            )}
            {canUpload && (
              <button
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0168FE] text-white rounded-lg text-sm font-medium hover:bg-[#0050CC] transition"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === c.value
                ? 'bg-[#0168FE] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.label}
            {activeCounts[c.value] > 0 && (
              <span className={`ml-1.5 ${filter === c.value ? 'text-blue-200' : 'text-gray-400'}`}>
                {activeCounts[c.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0168FE]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {documents.length === 0
                ? 'No documents yet'
                : 'No documents in this category'}
            </p>
            {canUpload && documents.length === 0 && (
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-3 text-sm text-[#0168FE] font-medium hover:underline"
              >
                Upload your first document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(doc => {
              const canManage = currentUserId === doc.uploaded_by || canUpload
              return (
                <div
                  key={doc.id}
                  className="group border border-gray-200 rounded-lg p-4 hover:border-[#0168FE]/30 hover:shadow-sm transition relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{getFileIcon(doc.file_type)}</span>
                    <div className="flex items-center gap-1">
                      {/* Public/Private indicator */}
                      {!publicOnly && canManage && (
                        <button
                          onClick={() => handleTogglePublic(doc)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition"
                          title={doc.is_public ? 'Public — click to make private' : 'Private — click to make public'}
                        >
                          {doc.is_public ? (
                            <Eye className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      )}
                      {/* Menu */}
                      {canManage && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpenId(menuOpenId === doc.id ? null : doc.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpenId === doc.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMenuOpenId(null)
                                  setEditingDoc(doc)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMenuOpenId(null)
                                  setReplacingDoc(doc)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Replace
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMenuOpenId(null)
                                  handleDelete(doc.id)
                                }}
                                disabled={deletingId === doc.id}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDocumentView(doc.id)}
                    className="block"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate hover:text-[#0168FE] transition">
                      {doc.file_name}
                    </p>
                  </a>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(doc.category)}`}>
                      {getCategoryLabel(doc.category)}
                    </span>
                    {doc.file_size > 0 && (
                      <span className="text-[10px] text-gray-400">{formatFileSize(doc.file_size)}</span>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{doc.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 text-[10px] text-gray-400">
                    <span>{doc.uploaded_by_name}</span>
                    <span>{timeAgo(doc.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        companyId={companyId}
        onUploaded={handleUploaded}
      />

      {/* Edit Modal */}
      {editingDoc && (
        <EditDocModal
          doc={editingDoc}
          companyId={companyId}
          onClose={() => setEditingDoc(null)}
          onSaved={(updated) => {
            setDocuments(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d))
            setEditingDoc(null)
          }}
        />
      )}

      {/* Replace Modal */}
      {replacingDoc && (
        <ReplaceDocModal
          doc={replacingDoc}
          companyId={companyId}
          onClose={() => setReplacingDoc(null)}
          onReplaced={() => {
            setReplacingDoc(null)
            fetchDocuments()
            setToast('Document replaced! Re-score to update your Kunfa Score.')
          }}
        />
      )}
    </div>
  )
}

// --- Upload Modal ---
function UploadModal({
  isOpen,
  onClose,
  companyId,
  onUploaded,
}: {
  isOpen: boolean
  onClose: () => void
  companyId: string
  onUploaded: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const reset = () => {
    setFile(null)
    setCategory('other')
    setDescription('')
    setIsPublic(false)
    setError('')
    setUploading(false)
    setDragOver(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleUpload = async () => {
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50MB.')
      return
    }

    setUploading(true)
    setError('')

    try {
      const timestamp = Date.now()
      const filePath = `dealroom/${companyId}/${timestamp}/${file.name}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error('Upload failed. Please try again.')
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path)

      const res = await fetch(`/api/dealroom/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          category,
          description: description || null,
          isPublic: isPublic,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed. Please try again.')
      }

      reset()
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const dropped = e.dataTransfer.files[0]
            if (dropped) {
              if (dropped.size > 50 * 1024 * 1024) {
                setError('File is too large. Maximum size is 50MB.')
              } else {
                setError('')
                setFile(dropped)
              }
            }
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
            dragOver
              ? 'border-[#0168FE] bg-blue-50'
              : file
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-gray-300 hover:border-[#0168FE]'
          }`}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.pdf,.ppt,.pptx,.key,.xlsx,.xls,.csv,.doc,.docx'
            input.onchange = (ev) => {
              const f = (ev.target as HTMLInputElement).files?.[0]
              if (f) {
                if (f.size > 50 * 1024 * 1024) {
                  setError('File is too large. Maximum size is 50MB.')
                } else {
                  setError('')
                  setFile(f)
                }
              }
            }
            input.click()
          }}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-6 h-6 text-emerald-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Drop a file here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Max file size: 50MB. Supported formats: PDF, PPT, PPTX, XLS, XLSX</p>
            </>
          )}
        </div>

        {/* Category */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
          >
            {UPLOAD_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this document"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE]"
          />
        </div>

        {/* Public checkbox */}
        <label className="flex items-center gap-2 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#0168FE] focus:ring-[#0168FE]"
          />
          <span className="text-sm text-gray-700">Make publicly visible on company profile</span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#0168FE] text-white hover:bg-[#0050CC] transition disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// --- Edit Document Modal ---
function EditDocModal({
  doc,
  companyId,
  onClose,
  onSaved,
}: {
  doc: DealRoomDocument
  companyId: string
  onClose: () => void
  onSaved: (updated: Partial<DealRoomDocument> & { id: string }) => void
}) {
  const [category, setCategory] = useState(doc.category)
  const [description, setDescription] = useState(doc.description || '')
  const [isPublic, setIsPublic] = useState(doc.is_public)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/dealroom/${companyId}/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, description: description || null, is_public: isPublic }),
      })
      if (!res.ok) throw new Error('Failed to update')
      onSaved({ id: doc.id, category, description: description || null, is_public: isPublic })
    } catch {
      setError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Document</h3>
        <p className="text-sm text-gray-600 mb-4 truncate">{doc.file_name}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              {UPLOAD_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#0168FE] focus:ring-[#0168FE]"
            />
            <span className="text-sm text-gray-700">Publicly visible</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#0168FE] text-white hover:bg-[#0050CC] transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// --- Replace Document Modal ---
function ReplaceDocModal({
  doc,
  companyId,
  onClose,
  onReplaced,
}: {
  doc: DealRoomDocument
  companyId: string
  onClose: () => void
  onReplaced: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleReplace = async () => {
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const timestamp = Date.now()
      const filePath = `dealroom/${companyId}/${timestamp}/${file.name}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw new Error('Upload failed.')

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path)

      const res = await fetch(`/api/dealroom/${companyId}/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
        }),
      })

      if (!res.ok) throw new Error('Failed to update document.')
      onReplaced()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Replace failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Replace Document</h3>
        <p className="text-sm text-gray-500 mb-4">
          Replacing: <span className="font-medium text-gray-700">{doc.file_name}</span>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.pdf,.ppt,.pptx,.key,.xlsx,.xls,.csv,.doc,.docx'
            input.onchange = (ev) => {
              const f = (ev.target as HTMLInputElement).files?.[0]
              if (f) setFile(f)
            }
            input.click()
          }}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
            file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-[#0168FE]'
          }`}
        >
          {file ? (
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
          ) : (
            <>
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-500">Click to select new file</p>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
            Cancel
          </button>
          <button
            onClick={handleReplace}
            disabled={!file || uploading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#0168FE] text-white hover:bg-[#0050CC] transition disabled:opacity-50"
          >
            {uploading ? 'Replacing...' : 'Replace'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
