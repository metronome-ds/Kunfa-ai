'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, Send } from 'lucide-react'

interface Note {
  id: string
  deal_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
  updated_at: string | null
}

interface NotesTimelineProps {
  dealId: string
  currentUserId: string
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function NotesTimeline({ dealId, currentUserId }: NotesTimelineProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState('')

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/pipeline/${dealId}/notes`)
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  async function handleAdd() {
    const content = newContent.trim()
    if (!content) return

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/pipeline/${dealId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add note')
      }
      setNewContent('')
      await fetchNotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(noteId: string) {
    const content = editContent.trim()
    if (!content) return

    setError('')
    try {
      const res = await fetch(`/api/pipeline/${dealId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to edit note')
      }
      setEditingId(null)
      setEditContent('')
      await fetchNotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  async function handleDelete(noteId: string) {
    setError('')
    try {
      const res = await fetch(`/api/pipeline/${dealId}/notes/${noteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete note')
      }
      await fetchNotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  return (
    <div className="space-y-3">
      {/* Add note */}
      <div className="flex gap-2">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={2}
          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none"
          placeholder="Add a note..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAdd()
            }
          }}
        />
        <button
          onClick={handleAdd}
          disabled={submitting || !newContent.trim()}
          className="self-end px-3 py-2 bg-[#007CF8] text-white rounded-lg hover:bg-[#0066D6] transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add note"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">No notes yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="bg-gray-50 rounded-lg p-3 group">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(note.id)}
                      className="px-3 py-1 bg-[#007CF8] text-white rounded text-xs font-medium hover:bg-[#0066D6] transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditContent('') }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{note.author_name}</span>
                        <span className="text-[10px] text-gray-400">{timeAgo(note.created_at)}</span>
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <span className="text-[10px] text-gray-400 italic">(edited)</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.content}</p>
                    </div>
                    {note.author_id === currentUserId && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => startEdit(note)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
