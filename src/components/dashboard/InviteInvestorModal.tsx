'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Send, UserPlus, Check } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface Investor {
  userId: string
  name: string | null
  email: string
  fundName: string | null
}

interface InviteInvestorModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  companyName: string
  onInvitesSent?: (count: number) => void
}

export default function InviteInvestorModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  onInvitesSent,
}: InviteInvestorModalProps) {
  const [query, setQuery] = useState('')
  const [investors, setInvestors] = useState<Investor[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [manualEmail, setManualEmail] = useState('')
  const [manualEmails, setManualEmails] = useState<string[]>([])
  const [personalMessage, setPersonalMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchInvestors = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/investors?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setInvestors(data.investors || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    searchInvestors('')
  }, [isOpen, searchInvestors])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchInvestors(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, searchInvestors])

  const toggleInvestor = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const addManualEmail = () => {
    const trimmed = manualEmail.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) return
    if (!manualEmails.includes(trimmed) && !selected.has(trimmed)) {
      setManualEmails((prev) => [...prev, trimmed])
    }
    setManualEmail('')
  }

  const removeManualEmail = (email: string) => {
    setManualEmails((prev) => prev.filter((e) => e !== email))
  }

  const totalSelected = selected.size + manualEmails.length

  const handleSend = async () => {
    if (totalSelected === 0) return
    setSending(true)
    try {
      const allEmails = [...Array.from(selected), ...manualEmails]
      const res = await fetch('/api/dealroom/invite-investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          investorEmails: allEmails,
          personalMessage: personalMessage.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSentCount(data.sent || 0)
        setSent(true)
        onInvitesSent?.(data.sent || 0)
      }
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setQuery('')
    setSelected(new Set())
    setManualEmails([])
    setManualEmail('')
    setPersonalMessage('')
    setSending(false)
    setSent(false)
    setSentCount(0)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6">
        {sent ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Invites Sent!</h3>
            <p className="text-sm text-gray-500 mb-6">
              {sentCount} invite{sentCount !== 1 ? 's' : ''} sent for {companyName}.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-[#0168FE] text-white rounded-lg font-semibold text-sm hover:bg-[#0050CC] transition"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-gray-900">Invite Investors to Review</h3>
              <p className="text-sm text-gray-500 mt-1">
                Select investors on Kunfa or add emails manually.
              </p>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search investors by name, email, or fund..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE] outline-none"
              />
            </div>

            {/* Investor List */}
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto mb-4">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-400">Searching...</div>
              ) : investors.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">
                  {query ? 'No investors found' : 'No investors on Kunfa yet'}
                </div>
              ) : (
                investors.map((inv) => (
                  <button
                    key={inv.email}
                    onClick={() => toggleInvestor(inv.email)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0 ${
                      selected.has(inv.email) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selected.has(inv.email)
                        ? 'border-[#0168FE] bg-[#0168FE]'
                        : 'border-gray-300'
                    }`}>
                      {selected.has(inv.email) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {inv.name || inv.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {inv.fundName ? `${inv.fundName} · ` : ''}{inv.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Manual Email */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                Or add email manually
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="investor@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addManualEmail()
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE] outline-none"
                />
                <button
                  onClick={addManualEmail}
                  disabled={!manualEmail.includes('@')}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition disabled:opacity-40"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
              {manualEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {manualEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      {email}
                      <button onClick={() => removeManualEmail(email)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Personal Message */}
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                Personal message (optional)
              </label>
              <textarea
                placeholder="Hi, I'd love for you to take a look at our company..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0168FE]/20 focus:border-[#0168FE] outline-none resize-none"
              />
            </div>

            {/* Selected summary */}
            {totalSelected > 0 && (
              <p className="text-xs text-gray-500 mb-3">
                {totalSelected} investor{totalSelected !== 1 ? 's' : ''} selected
              </p>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={totalSelected === 0 || sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#0168FE] text-white rounded-lg font-semibold text-sm hover:bg-[#0050CC] transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending
                ? 'Sending...'
                : `Send Invite${totalSelected !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
