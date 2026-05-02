'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

const ACCEPTED_MIME = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]
const ACCEPTED_EXT = '.png,.jpg,.jpeg,.webp,.svg,.gif'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

interface LogoUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
  className?: string
  disabled?: boolean
  /**
   * When true, renders a secondary "or paste a URL" text field below the
   * drop zone. Useful when the admin already has a CDN-hosted logo.
   */
  allowUrlFallback?: boolean
  /**
   * Applied to the hidden <input type="file"> for test targeting.
   */
  testId?: string
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'error'; message: string }

export function LogoUpload({
  value,
  onChange,
  label = 'Logo',
  className = '',
  disabled = false,
  allowUrlFallback = true,
  testId,
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      return `Unsupported file type (${file.type || 'unknown'}). Use PNG, JPEG, WebP, SVG, or GIF.`
    }
    if (file.size > MAX_SIZE) {
      return `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`
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

      setState({ status: 'uploading' })
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('kind', 'image')
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
        onChange(data.url)
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

  const applyUrl = useCallback(() => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    try {
      const u = new URL(trimmed)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        setState({ status: 'error', message: 'URL must start with http:// or https://' })
        return
      }
    } catch {
      setState({ status: 'error', message: 'Not a valid URL' })
      return
    }
    onChange(trimmed)
    setUrlInput('')
    setState({ status: 'idle' })
  }, [onChange, urlInput])

  const retry = useCallback(() => {
    setState({ status: 'idle' })
    inputRef.current?.click()
  }, [])

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[var(--ink-soft)] mb-1">{label}</label>

      {value ? (
        <div
          data-testid={testId ? `${testId}-uploaded` : undefined}
          className="flex items-center gap-3 p-3 bg-[var(--bg-elev)] rounded-lg border border-[var(--line)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Logo preview"
            className="w-14 h-14 rounded-lg object-contain bg-[var(--bg-sunk)] border border-[var(--line)]"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--ink)] truncate">Logo uploaded</p>
            <p className="text-xs text-[var(--ink-mute)] truncate">{value}</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || state.status === 'uploading'}
            className="px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] border border-[var(--line)] rounded-lg hover:bg-[var(--bg-sunk)] disabled:opacity-50"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={disabled || state.status === 'uploading'}
            className="p-1.5 text-[var(--ink-faint)] hover:text-red-600 disabled:opacity-50"
            aria-label="Remove logo"
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
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition cursor-pointer ${
            disabled || state.status === 'uploading'
              ? 'opacity-60 cursor-not-allowed'
              : dragOver
                ? 'border-[var(--line-strong)] bg-[var(--accent-soft)]'
                : 'border-[var(--line-strong)] bg-[var(--bg-elev)] hover:border-gray-400 hover:bg-[var(--bg-sunk)]'
          }`}
        >
          {state.status === 'uploading' ? (
            <>
              <Loader2 className="w-6 h-6 text-[var(--accent-ink)] animate-spin" />
              <p className="text-xs text-[var(--ink-soft)]">Uploading…</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                <Upload className="w-5 h-5 text-[var(--accent-ink)]" />
              </div>
              <p className="text-sm font-medium text-[var(--ink)]">
                Drop an image here, or click to browse
              </p>
              <p className="text-[11px] text-[var(--ink-mute)]">PNG, JPEG, WebP, SVG, or GIF · Max 5 MB</p>
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

      {allowUrlFallback && !value && state.status !== 'uploading' && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-[11px] text-[var(--ink-mute)] mb-1">
            <ImageIcon className="w-3 h-3" />
            <span>or paste an existing image URL</span>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://…"
              className="flex-1 px-3 py-2 border border-[var(--line)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]"
            />
            <button
              type="button"
              onClick={applyUrl}
              disabled={!urlInput.trim()}
              className="px-3 py-2 text-sm font-medium text-[var(--ink-soft)] border border-[var(--line)] rounded-lg hover:bg-[var(--bg-sunk)] disabled:opacity-50"
            >
              Use URL
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LogoUpload
