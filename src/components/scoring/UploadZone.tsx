'use client'

import { useCallback, useState, useRef } from 'react'
import UploadErrorBanner from '@/components/common/UploadErrorBanner'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB — KUN-37: hard ceiling for AI scoring pipeline

interface UploadZoneProps {
  label: string
  subtitle: string
  required: boolean
  accept: string
  file: File | null
  onFileSelect: (file: File | null) => void
}

function isFileTypeAccepted(file: File, accept: string): boolean {
  if (!accept) return true
  const acceptedExtensions = accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.startsWith('.'))

  if (acceptedExtensions.length === 0) return true

  const name = file.name.toLowerCase()
  return acceptedExtensions.some((ext) => name.endsWith(ext))
}

function formatAcceptedTypes(accept: string): string {
  const exts = accept
    .split(',')
    .map((s) => s.trim().replace(/^\./, '').toUpperCase())
    .filter(Boolean)
  if (exts.length === 0) return 'a supported file'
  if (exts.length === 1) return `a ${exts[0]} file`
  if (exts.length === 2) return `a ${exts[0]} or ${exts[1]} file`
  return `a ${exts.slice(0, -1).join(', ')}, or ${exts[exts.length - 1]} file`
}

export default function UploadZone({ label, subtitle, required, accept, file, onFileSelect }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const validateAndSelect = useCallback((f: File | null) => {
    setError('')
    if (!f) {
      onFileSelect(null)
      return
    }
    if (!isFileTypeAccepted(f, accept)) {
      setError(`Please upload ${formatAcceptedTypes(accept)}. Other file types are not supported.`)
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('This file is too large. Maximum size is 25MB. Try compressing your PDF or reducing the number of pages.')
      return
    }
    onFileSelect(f)
  }, [onFileSelect, accept])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) validateAndSelect(droppedFile)
  }, [validateAndSelect])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    validateAndSelect(selectedFile)
  }, [validateAndSelect])

  return (
    <div className="space-y-2">
      <div
        className={`upload-zone ${isDragOver ? 'dragover' : ''} ${file ? 'border-kunfa bg-blue-50' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <svg className="w-5 h-5 text-kunfa" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-kunfa-navy truncate max-w-[200px]">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFileSelect(null)
              }}
              className="text-gray-400 hover:text-red-500 ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-kunfa-navy">{label}</p>
            <p className="text-xs text-kunfa-text-secondary mt-1">{subtitle}</p>
          </>
        )}

        <div className="mt-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            required
              ? 'bg-blue-100 text-[#0168FE]'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {required ? 'REQUIRED' : 'OPTIONAL'}
          </span>
        </div>
      </div>
      {error && (
        <UploadErrorBanner
          message={error}
          onDismiss={() => setError('')}
        />
      )}
    </div>
  )
}
