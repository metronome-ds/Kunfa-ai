'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ExternalLink, MessageSquare, Send, Trash2,
  ThumbsUp, Flame, Lightbulb, HelpCircle, Loader2,
} from 'lucide-react'

interface DealDetail {
  id: string; company_id: string | null; external_company_name: string | null;
  external_description: string | null; external_sector: string | null;
  external_stage: string | null; external_raise_amount: number | null;
  external_docs_url: string | null; created_at: string; sharedByName: string;
  company: { company_name: string; slug: string; ai_score: number | null;
    sector: string | null; stage: string | null; raising_amount: number | null; logo_url: string | null } | null;
  interestBreakdown: { pass: number; watching: number; interested: number; committed: number };
  myInterest: string | null;
}

interface Comment {
  id: string; content: string; parentId: string | null;
  authorName: string; authorId: string; createdAt: string;
  reactions: Record<string, { count: number; hasReacted: boolean }>;
  replies?: Comment[];
}

const EMOJIS = [
  { emoji: '👍', icon: ThumbsUp },
  { emoji: '🔥', icon: Flame },
  { emoji: '💡', icon: Lightbulb },
  { emoji: '❓', icon: HelpCircle },
]

const INTEREST_OPTIONS = [
  { value: 'pass', label: 'Pass', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'watching', label: 'Watching', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'interested', label: 'Interested', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'committed', label: 'Committed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatAmount(amount: number | null): string {
  if (!amount) return ''
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount}`
}

export default function DealDiscussionPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const dealId = params.dealId as string

  const [community, setCommunity] = useState<{ name: string } | null>(null)
  const [deal, setDeal] = useState<DealDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const loadData = useCallback(async () => {
    const [communityRes, dealsRes, commentsRes] = await Promise.all([
      fetch(`/api/communities/${slug}`),
      fetch(`/api/communities/${slug}/deals`),
      fetch(`/api/communities/${slug}/deals/${dealId}/comments`),
    ])

    if (communityRes.ok) {
      const cd = await communityRes.json()
      setCommunity(cd.community)
    }
    if (dealsRes.ok) {
      const dd = await dealsRes.json()
      const found = (dd.deals || []).find((d: DealDetail) => d.id === dealId)
      if (found) setDeal(found)
    }
    if (commentsRes.ok) {
      const cc = await commentsRes.json()
      setComments(cc.comments || [])
    }
    setLoading(false)
  }, [slug, dealId])

  useEffect(() => { loadData() }, [loadData])

  async function handleComment() {
    if (!newComment.trim() || posting) return
    setPosting(true)
    const res = await fetch(`/api/communities/${slug}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment.trim(), communityDealId: dealId }),
    })
    if (res.ok) {
      setNewComment('')
      const commentsRes = await fetch(`/api/communities/${slug}/deals/${dealId}/comments`)
      if (commentsRes.ok) {
        const cc = await commentsRes.json()
        setComments(cc.comments || [])
      }
    }
    setPosting(false)
  }

  async function handleReply(parentId: string) {
    if (!replyContent.trim()) return
    const res = await fetch(`/api/communities/${slug}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyContent.trim(), communityDealId: dealId, parentId }),
    })
    if (res.ok) {
      setReplyContent('')
      setReplyingTo(null)
      const commentsRes = await fetch(`/api/communities/${slug}/deals/${dealId}/comments`)
      if (commentsRes.ok) {
        const cc = await commentsRes.json()
        setComments(cc.comments || [])
      }
    }
  }

  async function handleReact(postId: string, emoji: string) {
    const res = await fetch(`/api/communities/${slug}/posts/${postId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    if (res.ok) {
      const data = await res.json()
      setComments(prev => prev.map(c => {
        if (c.id === postId) return { ...c, reactions: data.reactions }
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === postId ? { ...r, reactions: data.reactions } : r) }
        }
        return c
      }))
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('Delete this comment?')) return
    const res = await fetch(`/api/communities/${slug}/posts/${postId}`, { method: 'DELETE' })
    if (res.ok) {
      const commentsRes = await fetch(`/api/communities/${slug}/deals/${dealId}/comments`)
      if (commentsRes.ok) {
        const cc = await commentsRes.json()
        setComments(cc.comments || [])
      }
    }
  }

  async function handleInterest(status: string) {
    const res = await fetch(`/api/communities/${slug}/deals/${dealId}/interest`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok && deal) {
      setDeal({ ...deal, myInterest: status })
      // Reload to get updated breakdown
      const dealsRes = await fetch(`/api/communities/${slug}/deals`)
      if (dealsRes.ok) {
        const dd = await dealsRes.json()
        const found = (dd.deals || []).find((d: DealDetail) => d.id === dealId)
        if (found) setDeal(found)
      }
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#007CF8]" /></div>
  }

  if (!deal) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Deal Not Found</h1>
        <button onClick={() => router.push(`/communities/${slug}`)} className="text-sm text-[#007CF8] hover:underline">Back to community</button>
      </div>
    )
  }

  const name = deal.company?.company_name || deal.external_company_name || 'Unknown'
  const sector = deal.company?.sector || deal.external_sector
  const stage = deal.company?.stage || deal.external_stage
  const amount = deal.company?.raising_amount || deal.external_raise_amount
  const score = deal.company?.ai_score
  const total = deal.interestBreakdown.pass + deal.interestBreakdown.watching + deal.interestBreakdown.interested + deal.interestBreakdown.committed

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button
        onClick={() => router.push(`/communities/${slug}`)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {community?.name || 'Community'}
      </button>

      {/* Deal card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          {deal.company?.logo_url ? (
            <img src={deal.company.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-400">{name[0]}</div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {deal.company ? (
                <Link href={`/company/${deal.company.slug}`} className="text-xl font-bold text-gray-900 hover:text-[#007CF8]">{name}</Link>
              ) : (
                <span className="text-xl font-bold text-gray-900">{name}</span>
              )}
              {score != null && (
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                  score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  score >= 60 ? 'bg-blue-100 text-blue-700' :
                  score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>{score}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              {sector && <span>{sector}</span>}
              {sector && stage && <span>·</span>}
              {stage && <span>{stage}</span>}
              {amount ? <><span>·</span><span className="font-medium text-gray-700">{formatAmount(amount)}</span></> : null}
              {deal.external_docs_url && (
                <a href={deal.external_docs_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#007CF8] hover:underline ml-2">
                  <ExternalLink className="w-3.5 h-3.5" /> Docs
                </a>
              )}
            </div>
          </div>
        </div>

        {deal.external_description && <p className="text-sm text-gray-600 mb-4">{deal.external_description}</p>}

        {/* Interest voting */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {INTEREST_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleInterest(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                deal.myInterest === opt.value
                  ? opt.color + ' border-current'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Interest bar */}
        {total > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 flex-1">
              {deal.interestBreakdown.pass > 0 && <div className="bg-gray-300" style={{ flex: deal.interestBreakdown.pass }} />}
              {deal.interestBreakdown.watching > 0 && <div className="bg-blue-400" style={{ flex: deal.interestBreakdown.watching }} />}
              {deal.interestBreakdown.interested > 0 && <div className="bg-amber-400" style={{ flex: deal.interestBreakdown.interested }} />}
              {deal.interestBreakdown.committed > 0 && <div className="bg-emerald-400" style={{ flex: deal.interestBreakdown.committed }} />}
            </div>
            <span>{deal.interestBreakdown.pass} pass · {deal.interestBreakdown.watching} watching · {deal.interestBreakdown.interested} interested · {deal.interestBreakdown.committed} committed</span>
          </div>
        )}

        <div className="text-xs text-gray-400 mt-3">Shared by {deal.sharedByName} · {timeAgo(deal.created_at)}</div>
      </div>

      {/* Comment input */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleComment()}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
            placeholder="Add a comment..."
          />
          <button
            onClick={handleComment}
            disabled={!newComment.trim() || posting}
            className="px-4 py-2.5 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comments */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No comments yet. Start the discussion!</div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id}>
              <CommentCard
                comment={comment}
                onReact={(emoji) => handleReact(comment.id, emoji)}
                onDelete={() => handleDelete(comment.id)}
                onReplyClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                isReplying={replyingTo === comment.id}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                onReply={() => handleReply(comment.id)}
              />
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 mt-2 space-y-2">
                  {comment.replies.map(reply => (
                    <CommentCard
                      key={reply.id}
                      comment={reply}
                      onReact={(emoji) => handleReact(reply.id, emoji)}
                      onDelete={() => handleDelete(reply.id)}
                      isReply
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CommentCard({
  comment, onReact, onDelete, onReplyClick, isReplying, replyContent, setReplyContent, onReply, isReply,
}: {
  comment: Comment; onReact: (emoji: string) => void; onDelete: () => void;
  onReplyClick?: () => void; isReplying?: boolean;
  replyContent?: string; setReplyContent?: (c: string) => void; onReply?: () => void;
  isReply?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${isReply ? 'border-gray-100' : ''}`}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#007CF8]/10 flex items-center justify-center text-xs font-semibold text-[#007CF8]">
            {(comment.authorName || '?')[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2 ml-9">{comment.content}</p>

      <div className="flex items-center gap-1.5 ml-9">
        {EMOJIS.map(({ emoji, icon: Icon }) => {
          const r = comment.reactions[emoji]
          return (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition ${
                r?.hasReacted ? 'bg-[#007CF8]/10 text-[#007CF8]' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-3 h-3" />
              {r?.count || ''}
            </button>
          )
        })}
        {!isReply && onReplyClick && (
          <button onClick={onReplyClick} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-400 hover:bg-gray-100">
            <MessageSquare className="w-3 h-3" /> Reply
          </button>
        )}
      </div>

      {isReplying && setReplyContent && onReply && (
        <div className="mt-2 ml-9 flex items-center gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onReply()}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
            placeholder="Write a reply..."
            autoFocus
          />
          <button onClick={onReply} disabled={!replyContent?.trim()} className="px-3 py-2 bg-[#007CF8] text-white text-sm rounded-lg hover:bg-[#0066D6] disabled:opacity-50">Reply</button>
        </div>
      )}
    </div>
  )
}
