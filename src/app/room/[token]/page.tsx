'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, Download, Lock, Eye, AlertCircle, ExternalLink } from 'lucide-react'
import KunfaLogo from '@/components/common/KunfaLogo'

interface RoomDocument {
  id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  category: string
  description: string | null
  created_at: string
}

interface CompanyInfo {
  id: string
  company_name: string
  one_liner: string | null
  industry: string | null
  stage: string | null
  overall_score: number | null
}

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
  const labels: Record<string, string> = {
    pitch_deck: 'Pitch Deck',
    financials: 'Financials',
    cap_table: 'Cap Table',
    legal: 'Legal',
    term_sheet: 'Term Sheet',
    due_diligence: 'Due Diligence',
    investment_memo: 'Investment Memo',
    internal_memo: 'Internal Memo',
    product: 'Product',
    other: 'Other',
  }
  return labels[category] || category
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return '📄'
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return '📊'
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📑'
  return '📎'
}

function formatFileSize(bytes: number) {
  if (!bytes || bytes === 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function RoomPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'password' | 'ready' | 'error' | 'expired'>('loading')
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [documents, setDocuments] = useState<RoomDocument[]>([])
  const [allowDownload, setAllowDownload] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${token}`)
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 410) {
          setStatus('expired')
          setErrorMessage(data.error || 'This link has expired')
          return
        }
        setStatus('error')
        setErrorMessage(data.error || 'Link not found')
        return
      }

      setCompany(data.company)
      setAllowDownload(data.allowDownload)

      if (data.needsPassword && data.documents.length === 0) {
        setStatus('password')
      } else {
        setDocuments(data.documents || [])
        setStatus('ready')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Failed to load deal room')
    }
  }, [token])

  useEffect(() => {
    if (token) fetchRoom()
  }, [token, fetchRoom])

  const verifyPassword = async () => {
    setVerifying(true)
    setPasswordError('')
    try {
      const res = await fetch(`/api/room/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPasswordError(data.error || 'Incorrect password')
        return
      }

      setDocuments(data.documents || [])
      setAllowDownload(data.allowDownload)
      setStatus('ready')
    } catch {
      setPasswordError('Failed to verify password')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition">
            <KunfaLogo height={22} />
          </Link>
          <span className="text-xs text-gray-400">Deal Room</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Loading */}
        {status === 'loading' && (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" />
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center py-24">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Not Found</h1>
            <p className="text-sm text-gray-500">{errorMessage}</p>
          </div>
        )}

        {/* Expired */}
        {status === 'expired' && (
          <div className="text-center py-24">
            <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Expired</h1>
            <p className="text-sm text-gray-500">{errorMessage}</p>
            <p className="text-sm text-gray-400 mt-2">Contact the sender for a new link.</p>
          </div>
        )}

        {/* Password gate */}
        {status === 'password' && (
          <div className="max-w-md mx-auto py-16">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
              <Lock className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              {company && (
                <h1 className="text-xl font-semibold text-gray-900 mb-1">{company.company_name}</h1>
              )}
              <p className="text-sm text-gray-500 mb-6">This deal room is password protected</p>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-600">{passwordError}</p>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); verifyPassword() }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] mb-4"
                />
                <button
                  type="submit"
                  disabled={!password || verifying}
                  className="w-full py-3 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'View Deal Room'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Ready — documents view */}
        {status === 'ready' && (
          <div>
            {/* Company header */}
            {company && (
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>
                {company.one_liner && (
                  <p className="text-gray-600 mt-1">{company.one_liner}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {company.industry && (
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      {company.industry}
                    </span>
                  )}
                  {company.stage && (
                    <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                      {company.stage}
                    </span>
                  )}
                  {company.overall_score && (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      Kunfa Score: {company.overall_score}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Documents */}
            {documents.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No documents available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#007CF8]/30 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{getFileIcon(doc.file_type)}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(doc.category)}`}>
                        {getCategoryLabel(doc.category)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-900 truncate mb-1">{doc.file_name}</p>

                    {doc.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{doc.description}</p>
                    )}

                    {doc.file_size > 0 && (
                      <p className="text-[10px] text-gray-400 mb-3">{formatFileSize(doc.file_size)}</p>
                    )}

                    <div className="flex items-center gap-2 mt-auto">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </a>
                      {allowDownload && (
                        <a
                          href={doc.file_url}
                          download={doc.file_name}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#007CF8] text-white rounded-lg text-xs font-medium hover:bg-[#0066D6] transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 py-8 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <Link href="/" className="text-[#007CF8] hover:underline font-medium">
              Kunfa
            </Link>
            {' '}&mdash; Venture Intelligence
          </p>
        </div>
      </footer>
    </div>
  )
}
