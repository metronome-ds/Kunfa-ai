'use client'

import { AlertCircle, AlertTriangle, RefreshCw, X } from 'lucide-react'

export type UploadErrorVariant = 'error' | 'warning'

export interface UploadErrorBannerProps {
  variant?: UploadErrorVariant
  title?: string
  message: string
  onDismiss: () => void
  onRetry?: () => void
  retryLabel?: string
}

/**
 * Persistent, dismissible upload error/warning banner.
 *
 * Used across all upload flows (scoring, deal room, rescoring, deal documents)
 * to give users consistent, actionable feedback on upload failures.
 *
 * - variant='error' (red)   → hard failures: file too large, invalid type, network
 * - variant='warning' (amber) → soft failures: upload succeeded but downstream
 *                               processing failed (e.g. AI scoring 413)
 */
export default function UploadErrorBanner({
  variant = 'error',
  title,
  message,
  onDismiss,
  onRetry,
  retryLabel = 'Retry',
}: UploadErrorBannerProps) {
  const isError = variant === 'error'

  const containerClass = isError
    ? 'bg-red-50 border-red-200 text-red-900'
    : 'bg-amber-50 border-amber-200 text-amber-900'

  const iconClass = isError ? 'text-red-600' : 'text-amber-600'
  const buttonClass = isError
    ? 'text-red-700 hover:bg-red-100'
    : 'text-amber-700 hover:bg-amber-100'

  const Icon = isError ? AlertCircle : AlertTriangle

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-3 border rounded-lg px-4 py-3 ${containerClass}`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold mb-0.5">{title}</p>}
        <p className="text-sm leading-relaxed">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition ${buttonClass}`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {retryLabel}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={`flex-shrink-0 p-1 rounded-md transition ${buttonClass}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
