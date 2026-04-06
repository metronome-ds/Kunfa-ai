'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Upload, Trash2, Filter, X, FolderOpen, MoreVertical, Pencil, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ShareDealRoom from './ShareDealRoom'
import UploadErrorBanner from '@/components/common/UploadErrorBanner'

const DEAL_ROOM_MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const DEAL_ROOM_ACCEPTED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.key', '.xlsx', '.xls', '.csv', '.doc', '.docx'] as const
const DEAL_ROOM_ACCEPT_ATTR = DEAL_ROOM_ACCEPTED_EXTENSIONS.join(',')

type DealRoomUploadErrorKind = 'size' | 'type' | 'network' | 'generic'
interface DealRoomUploadError {
  kind: DealRoomUploadErrorKind
  message: string
}

function validateDealRoomFile(file: File): DealRoomUploadError | null {
  const name = file.name.toLowerCase()
  const extOk = DEAL_ROOM_ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
  if (!extOk) {
    return {
      kind: 'type',
      message: 'Please upload a PDF, PowerPoint, Word, Excel, or CSV file. Other file types are not supported.',
    }
  }
  if (file.size > DEAL_ROOM_MAX_FILE_SIZE) {
    return {
      kind: 'size',
      message: 'This file is too large. Maximum size is 25MB. Try compressing your PDF or reducing the number of pages.',
    }
  }
  return null
}

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

  const handleUploaded = (count?: number) => {
    setUploadOpen(false)
    fetchDocuments()
    const label = count && count > 1 ? `${count} documents uploaded` : 'Document uploaded'
    setToast(`${label}! Re-score to include ${count && count > 1 ? 'them' : 'it'} in your Kunfa Score.`)
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

// --- Upload Modal (multi-file) ---

const MAX_BATCH_FILES = 10

type QueuedFileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface QueuedFile {
  id: string // unique key
  file: File
  category: string
  description: string
  isPublic: boolean
  status: QueuedFileStatus
  error: string | null
  validationError: string | null // set at add-time for invalid files
}

function UploadModal({
  isOpen,
  onClose,
  companyId,
  onUploaded,
}: {
  isOpen: boolean
  onClose: () => void
  companyId: string
  onUploaded: (count?: number) => void
}) {
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [done, setDone] = useState(false)
  const [doneStats, setDoneStats] = useState({ success: 0, failed: 0, total: 0 })
  const fileIdCounter = useRef(0)

  const reset = () => {
    setQueue([])
    setUploading(false)
    setBatchError(null)
    setDragOver(false)
    setDone(false)
    setDoneStats({ success: 0, failed: 0, total: 0 })
    fileIdCounter.current = 0
  }

  const handleClose = () => {
    if (uploading) return // prevent close during upload
    reset()
    onClose()
  }

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files)
    const currentCount = queue.length
    if (currentCount + arr.length > MAX_BATCH_FILES) {
      setBatchError(`You can upload up to ${MAX_BATCH_FILES} files at a time. ${currentCount} already queued.`)
      return
    }
    setBatchError(null)

    const newItems: QueuedFile[] = arr.map((f) => {
      fileIdCounter.current += 1
      const validation = validateDealRoomFile(f)
      return {
        id: `f-${fileIdCounter.current}`,
        file: f,
        category: 'other',
        description: '',
        isPublic: false,
        status: validation ? 'error' : 'pending',
        error: null,
        validationError: validation?.message || null,
      }
    })

    setQueue((prev) => [...prev, ...newItems])
  }

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id))
  }

  const updateFile = (id: string, updates: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const openFilePicker = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = DEAL_ROOM_ACCEPT_ATTR
    input.multiple = true
    input.onchange = (ev) => {
      const selected = (ev.target as HTMLInputElement).files
      if (selected && selected.length > 0) addFiles(selected)
    }
    input.click()
  }

  const uploadSingleFile = async (item: QueuedFile): Promise<boolean> => {
    // Skip files with validation errors
    if (item.validationError) return false

    updateFile(item.id, { status: 'uploading', error: null })

    try {
      const timestamp = Date.now()
      const filePath = `dealroom/${companyId}/${timestamp}/${item.file.name}`

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, item.file, { cacheControl: '3600', upsert: false })

      if (uploadErr) {
        updateFile(item.id, { status: 'error', error: 'Upload to storage failed.' })
        return false
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path)

      const res = await fetch(`/api/dealroom/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: publicUrl,
          fileName: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type || 'application/octet-stream',
          category: item.category,
          description: item.description || null,
          isPublic: item.isPublic,
        }),
      })

      if (!res.ok) {
        updateFile(item.id, { status: 'error', error: 'Failed to save document record.' })
        return false
      }

      updateFile(item.id, { status: 'done' })
      return true
    } catch {
      updateFile(item.id, { status: 'error', error: 'Upload failed. Check your connection.' })
      return false
    }
  }

  const handleUploadAll = async () => {
    const uploadable = queue.filter((f) => f.status === 'pending')
    if (uploadable.length === 0) return

    setUploading(true)
    setBatchError(null)

    let successCount = 0
    for (const item of uploadable) {
      const ok = await uploadSingleFile(item)
      if (ok) successCount++
    }

    setUploading(false)

    const total = uploadable.length
    const failed = total - successCount

    if (successCount > 0) {
      setDoneStats({ success: successCount, failed, total })
      setDone(true)
    }
  }

  const handleDoneClose = () => {
    const count = doneStats.success
    reset()
    onClose()
    onUploaded(count)
  }

  const pendingCount = queue.filter((f) => f.status === 'pending').length
  const hasValidationErrors = queue.some((f) => f.validationError)

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6">
        {done ? (
          /* --- Done Summary --- */
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Upload Complete</h3>
            <p className="text-sm text-gray-500 mb-1">
              {doneStats.success} of {doneStats.total} file{doneStats.total !== 1 ? 's' : ''} uploaded successfully.
            </p>
            {doneStats.failed > 0 && (
              <p className="text-sm text-red-500">
                {doneStats.failed} file{doneStats.failed !== 1 ? 's' : ''} failed.
              </p>
            )}
            <button
              onClick={handleDoneClose}
              className="mt-6 px-8 py-2.5 bg-[#0168FE] text-white rounded-lg font-semibold text-sm hover:bg-[#0050CC] transition"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Document{queue.length > 1 ? 's' : ''}
            </h3>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
              }}
              onClick={openFilePicker}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                dragOver
                  ? 'border-[#0168FE] bg-blue-50'
                  : 'border-gray-300 hover:border-[#0168FE]'
              }`}
            >
              <Upload className="w-7 h-7 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Drop files here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">
                Max 25MB per file &middot; Up to {MAX_BATCH_FILES} files &middot; PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, CSV
              </p>
            </div>

            {batchError && (
              <div className="mt-3">
                <UploadErrorBanner message={batchError} onDismiss={() => setBatchError(null)} />
              </div>
            )}

            {/* File Queue */}
            {queue.length > 0 && (
              <div className="mt-4 space-y-3 max-h-72 overflow-y-auto">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-3 ${
                      item.validationError
                        ? 'border-red-200 bg-red-50'
                        : item.status === 'done'
                          ? 'border-green-200 bg-green-50'
                          : item.status === 'error'
                            ? 'border-red-200 bg-red-50'
                            : item.status === 'uploading'
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-gray-200'
                    }`}
                  >
                    {/* Row 1: file info + status + remove */}
                    <div className="flex items-center gap-2">
                      {item.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : item.status === 'error' || item.validationError ? (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      ) : item.status === 'uploading' ? (
                        <div className="w-4 h-4 border-2 border-[#0168FE] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(item.file.size)}</p>
                      </div>
                      {item.status !== 'uploading' && item.status !== 'done' && (
                        <button
                          onClick={() => removeFile(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Validation error */}
                    {item.validationError && (
                      <p className="text-xs text-red-600 mt-1">{item.validationError}</p>
                    )}

                    {/* Upload error */}
                    {!item.validationError && item.status === 'error' && item.error && (
                      <p className="text-xs text-red-600 mt-1">{item.error}</p>
                    )}

                    {/* Category + description (only for editable items) */}
                    {!item.validationError && item.status === 'pending' && (
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          value={item.category}
                          onChange={(e) => updateFile(item.id, { category: e.target.value })}
                          className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0168FE] bg-white"
                        >
                          {UPLOAD_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateFile(item.id, { description: e.target.value })}
                          placeholder="Description (optional)"
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0168FE]"
                        />
                        <label className="flex items-center gap-1 cursor-pointer flex-shrink-0" title="Make publicly visible">
                          <input
                            type="checkbox"
                            checked={item.isPublic}
                            onChange={(e) => updateFile(item.id, { isPublic: e.target.checked })}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-[#0168FE] focus:ring-[#0168FE]"
                          />
                          <Eye className="w-3 h-3 text-gray-400" />
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add more files button */}
            {queue.length > 0 && queue.length < MAX_BATCH_FILES && !uploading && (
              <button
                onClick={openFilePicker}
                className="mt-3 text-sm text-[#0168FE] font-medium hover:underline"
              >
                + Add more files
              </button>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAll}
                disabled={pendingCount === 0 || uploading}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#0168FE] text-white hover:bg-[#0050CC] transition disabled:opacity-50"
              >
                {uploading
                  ? 'Uploading...'
                  : pendingCount === 0
                    ? 'Upload'
                    : pendingCount === 1
                      ? 'Upload'
                      : `Upload All (${pendingCount})`}
              </button>
            </div>

            {hasValidationErrors && !uploading && (
              <p className="text-xs text-gray-400 text-center mt-2">
                Files with errors will be skipped during upload.
              </p>
            )}
          </>
        )}
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
