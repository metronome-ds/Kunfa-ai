'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Upload, Trash2, Filter, X, FolderOpen, MoreVertical, Pencil, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ShareDealRoom from './ShareDealRoom'
import UploadErrorBanner from '@/components/common/UploadErrorBanner'

const DEAL_ROOM_MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const DEAL_ROOM_ACCEPTED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.key', '.xlsx', '.xls', '.csv', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'] as const
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
      message: 'Please upload a PDF, PowerPoint, Word, Excel, CSV, TXT, or image file. Other file types are not supported.',
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
  file_url: string | null
  file_size: number
  file_type: string
  category: string
  description: string | null
  is_public: boolean
  is_private?: boolean
  restricted?: boolean
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
  isOwnerView?: boolean
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

const PRIVATE_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'term_sheet_analysis', label: 'Term Sheet Analysis' },
  { value: 'board_minutes', label: 'Board Minutes' },
  { value: 'internal_financials', label: 'Internal Financials' },
  { value: 'legal_draft', label: 'Legal Draft' },
  { value: 'cap_table_draft', label: 'Cap Table Draft' },
  { value: 'notes', label: 'Notes' },
  { value: 'other', label: 'Other' },
]

const PRIVATE_UPLOAD_CATEGORIES = PRIVATE_CATEGORIES.filter(c => c.value !== 'all')

const ALL_CATEGORIES = [...CATEGORIES, ...PRIVATE_CATEGORIES.filter(pc => !CATEGORIES.find(c => c.value === pc.value))]

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
    term_sheet_analysis: 'bg-violet-100 text-violet-700',
    board_minutes: 'bg-orange-100 text-orange-700',
    internal_financials: 'bg-emerald-100 text-emerald-700',
    legal_draft: 'bg-amber-100 text-amber-700',
    cap_table_draft: 'bg-purple-100 text-purple-700',
    notes: 'bg-slate-100 text-slate-700',
    other: 'bg-gray-100 text-gray-700',
  }
  return colors[category] || colors.other
}

function getCategoryLabel(category: string) {
  return ALL_CATEGORIES.find(c => c.value === category)?.label || category
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

export default function DealRoom({ companyId, companyName, canUpload, canShare, currentUserId, publicOnly = false, isOwnerView = false, onRequestRescore, sessionId = null, trackingEnabled = false }: DealRoomProps) {
  const [documents, setDocuments] = useState<DealRoomDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<'investor' | 'private'>('investor')
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

  const isPrivateTab = isOwnerView && activeTab === 'private'
  const tabDocs = isOwnerView
    ? documents.filter(d => isPrivateTab ? d.is_private : !d.is_private)
    : documents
  const currentCategories = isPrivateTab ? PRIVATE_CATEGORIES : CATEGORIES
  const filtered = filter === 'all' ? tabDocs : tabDocs.filter(d => d.category === filter)
  const activeCounts = currentCategories.reduce((acc, c) => {
    acc[c.value] = c.value === 'all' ? tabDocs.length : tabDocs.filter(d => d.category === c.value).length
    return acc
  }, {} as Record<string, number>)
  const investorCount = documents.filter(d => !d.is_private).length
  const privateCount = documents.filter(d => d.is_private).length

  return (
    <div id="deal-room" className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Toast */}
      {toast && (
        <div className="mx-6 mt-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <RefreshCw className="w-4 h-4 text-[#007CF8] flex-shrink-0" />
          <p className="text-sm text-blue-800 flex-1">{toast}</p>
          {onRequestRescore && (
            <button
              onClick={() => { setToast(null); onRequestRescore() }}
              className="text-xs font-semibold text-[#007CF8] hover:underline whitespace-nowrap"
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
            <div className="w-10 h-10 rounded-lg bg-[#007CF8]/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-[#007CF8]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isOwnerView ? (isPrivateTab ? 'Private Documents' : 'Investor Room') : 'Deal Room'}
              </h2>
              <p className="text-xs text-gray-500">
                {isOwnerView
                  ? (isPrivateTab
                    ? 'Internal documents only visible to you and your team. Never shared with investors or used in AI scoring.'
                    : 'Documents visible to investors who view your company profile.')
                  : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canShare && !isPrivateTab && (
              <ShareDealRoom companyId={companyId} companyName={companyName} />
            )}
            {canUpload && (
              <button
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            )}
          </div>
        </div>

        {/* Tabs — only show for owner view */}
        {isOwnerView && (
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => { setActiveTab('investor'); setFilter('all') }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'investor'
                  ? 'bg-[#007CF8] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Investor Room
              {investorCount > 0 && (
                <span className={`ml-1.5 ${activeTab === 'investor' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {investorCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('private'); setFilter('all') }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'private'
                  ? 'bg-[#007CF8] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Private Docs
              {privateCount > 0 && (
                <span className={`ml-1.5 ${activeTab === 'private' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {privateCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Category Filters */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {currentCategories.map(c => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === c.value
                ? 'bg-[#007CF8] text-white'
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#007CF8]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {tabDocs.length === 0
                ? (isPrivateTab ? 'No private documents yet' : 'No documents yet')
                : 'No documents in this category'}
            </p>
            {canUpload && tabDocs.length === 0 && (
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-3 text-sm text-[#007CF8] font-medium hover:underline"
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
                  className="group border border-gray-200 rounded-lg p-4 hover:border-[#007CF8]/30 hover:shadow-sm transition relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{getFileIcon(doc.file_type)}</span>
                    <div className="flex items-center gap-1">
                      {/* Access level indicator — hidden for private docs */}
                      {!publicOnly && !isPrivateTab && (
                        canManage ? (
                          <button
                            onClick={() => handleTogglePublic(doc)}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border transition ${
                              doc.is_public
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                            }`}
                            title={doc.is_public ? 'Open — click to restrict' : 'Restricted — click to open'}
                          >
                            {doc.is_public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {doc.is_public ? 'Open' : 'Restricted'}
                          </button>
                        ) : !doc.is_public ? (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                            <EyeOff className="w-3 h-3" />
                            Restricted
                          </span>
                        ) : null
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
                  {doc.file_url ? (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackDocumentView(doc.id)}
                      className="block"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate hover:text-[#007CF8] transition">
                        {doc.file_name}
                      </p>
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-500 truncate">
                        {doc.file_name}
                      </p>
                    </div>
                  )}
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
        isPrivateTab={isPrivateTab}
      />

      {/* Edit Modal */}
      {editingDoc && (
        <EditDocModal
          doc={editingDoc}
          companyId={companyId}
          isPrivateTab={isPrivateTab}
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
  isPrivateTab = false,
}: {
  isOpen: boolean
  onClose: () => void
  companyId: string
  onUploaded: (count?: number) => void
  isPrivateTab?: boolean
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
        isPublic: true,
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
          isPrivate: isPrivateTab,
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
              className="mt-6 px-8 py-2.5 bg-[#007CF8] text-white rounded-lg font-semibold text-sm hover:bg-[#0066D6] transition"
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
                  ? 'border-[#007CF8] bg-blue-50'
                  : 'border-gray-300 hover:border-[#007CF8]'
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
                        <div className="w-4 h-4 border-2 border-[#007CF8] border-t-transparent rounded-full animate-spin flex-shrink-0" />
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
                          className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007CF8] bg-white"
                        >
                          {(isPrivateTab ? PRIVATE_UPLOAD_CATEGORIES : UPLOAD_CATEGORIES).map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateFile(item.id, { description: e.target.value })}
                          placeholder="Description (optional)"
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#007CF8]"
                        />
                        {!isPrivateTab && (
                          <button
                            type="button"
                            onClick={() => updateFile(item.id, { isPublic: !item.isPublic })}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition flex-shrink-0 ${
                              item.isPublic
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                            title={item.isPublic ? 'Open — visible to all visitors' : 'Restricted — authorized investors only'}
                          >
                            {item.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {item.isPublic ? 'Open' : 'Restricted'}
                          </button>
                        )}
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
                className="mt-3 text-sm text-[#007CF8] font-medium hover:underline"
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
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#007CF8] text-white hover:bg-[#0066D6] transition disabled:opacity-50"
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
  isPrivateTab = false,
}: {
  doc: DealRoomDocument
  companyId: string
  onClose: () => void
  onSaved: (updated: Partial<DealRoomDocument> & { id: string }) => void
  isPrivateTab?: boolean
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
              {(isPrivateTab ? PRIVATE_UPLOAD_CATEGORIES : UPLOAD_CATEGORIES).map(c => (
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
          {!isPrivateTab && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Access Level</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                  isPublic
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Eye className="w-4 h-4" />
                Open
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                  !isPublic
                    ? 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <EyeOff className="w-4 h-4" />
                Restricted
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isPublic ? 'Visible to all visitors' : 'Only authorized investors can download'}
            </p>
          </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#007CF8] text-white hover:bg-[#0066D6] transition disabled:opacity-50"
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
            file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-[#007CF8]'
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
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#007CF8] text-white hover:bg-[#0066D6] transition disabled:opacity-50"
          >
            {uploading ? 'Replacing...' : 'Replace'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
