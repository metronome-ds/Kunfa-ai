'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'

// Keep aligned with /api/upload DOCUMENT_TYPES server allowlist.
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.apple.keynote',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
]
const ACCEPTED_EXT = '.pdf,.ppt,.pptx,.key,.xls,.xlsx,.doc,.docx,.csv'
const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

interface UploadedFile {
  url: string
  name: string
  size: number
  type: string
}

interface SingleDocumentUploadProps {
  label: string
  value: UploadedFile | null
  onChange: (file: UploadedFile | null) => void
  /**
   * When true, the field is required to proceed. Visual only — the parent
   * form enforces validation.
   */
  required?: boolean
  helpText?: string
  className?: string
  disabled?: boolean
  /**
   * Applied to the hidden <input type="file"> for test targeting.
   */
  testId?: string
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string }
  | { status: 'error'; message: string }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileTypeIcon(type: string) {
  if (type === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />
  }
  if (
    type.includes('presentation') ||
    type.includes('powerpoint') ||
    type === 'application/vnd.apple.keynote'
  ) {
    return <FileText className="w-5 h-5 text-orange-500" />
  }
  if (type.includes('spreadsheet') || type.includes('excel') || type === 'text/csv') {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
  }
  return <FileIcon className="w-5 h-5 text-gray-400" />
}

export function SingleDocumentUpload({
  label,
  value,
  onChange,
  required = false,
  helpText,
  className = '',
  disabled = false,
  testId,
}: SingleDocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [dragOver, setDragOver] = useState(false)

  const validate = useCallback((file: File): string | null => {
    // Some browsers / OSes leave file.type blank. Fall back to extension check.
    if (file.type && !ACCEPTED_MIME.includes(file.type)) {
      return `Unsupported file type (${file.type}). Use PDF, PPT, DOC, XLS, or CSV.`
    }
    if (!file.type) {
      const ext = file.name.toLowerCase().split('.').pop()
      const allowed = ['pdf', 'ppt', 'pptx', 'key', 'xls', 'xlsx', 'doc', 'docx', 'csv']
      if (!ext || !allowed.includes(ext)) {
        return `Unsupported file extension. Use PDF, PPT, DOC, XLS, or CSV.`
      }
    }
    if (file.size > MAX_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 50 MB.`
    }
    return null
  }, [])

  const upload = useCallback(
    async (file: File) => {
      const error = validate(file)
      if (error) {
        setState({ status: 'error', message: error })
        return
      }

      setState({ status: 'uploading', fileName: file.name })
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('kind', 'document')
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setState({
            status: 'error',
            message: body.error || `Upload failed (status ${res.status})`,
          })
          return
        }
        const data = await res.json()
        if (typeof data.url !== 'string' || !data.url) {
          setState({ status: 'error', message: 'Upload succeeded but server returned no URL' })
          return
        }
        onChange({
          url: data.url,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
        })
        setState({ status: 'idle' })
      } catch (err) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Upload failed',
        })
      }
    },
    [onChange, validate],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      upload(files[0])
    },
    [upload],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled || state.status === 'uploading') return
      handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles, state.status],
  )

  const remove = useCallback(() => {
    onChange(null)
    setState({ status: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }, [onChange])

  const retry = useCallback(() => {
    setState({ status: 'idle' })
    inputRef.current?.click()
  }, [])

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {value ? (
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
            {fileTypeIcon(value.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{value.name}</p>
            <p className="text-xs text-gray-500">{formatBytes(value.size)} · Uploaded</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || state.status === 'uploading'}
            className="px-2.5 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={disabled || state.status === 'uploading'}
            className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-50"
            aria-label={`Remove ${label}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && state.status !== 'uploading' && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled && state.status !== 'uploading') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled && state.status !== 'uploading') setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 transition cursor-pointer ${
            disabled || state.status === 'uploading'
              ? 'opacity-60 cursor-not-allowed'
              : dragOver
                ? 'border-[#007CF8] bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          {state.status === 'uploading' ? (
            <>
              <Loader2 className="w-6 h-6 text-[#007CF8] animate-spin" />
              <p className="text-xs text-gray-600 truncate max-w-full">
                Uploading {state.fileName}…
              </p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#007CF8]" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                Drop a file here, or click to browse
              </p>
              <p className="text-[11px] text-gray-500">
                PDF, PPT, DOC, XLS, or CSV · Max 50 MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT}
        className="hidden"
        data-testid={testId}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {helpText && state.status !== 'error' && (
        <p className="text-[11px] text-gray-500 mt-1">{helpText}</p>
      )}

      {state.status === 'error' && (
        <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-red-700 font-medium">Upload failed</p>
            <p className="text-red-600 mt-0.5 break-words">{state.message}</p>
          </div>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 rounded"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}
    </div>
  )
}

export default SingleDocumentUpload
