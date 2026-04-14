'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Users, Settings, UserPlus, Send, MessageSquare, ThumbsUp, Flame,
  Lightbulb, HelpCircle, Trash2, ChevronDown, Search, ExternalLink,
  TrendingUp, X, Loader2, MoreHorizontal,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Community {
  id: string; name: string; slug: string; description: string | null;
  thesis: string | null; membership_type: string; mode: string;
  deal_sharing: string; memberCount: number; dealCount: number; userRole: string;
}

interface FeedPost {
  id: string; content: string; authorName: string; authorId: string;
  createdAt: string; replyCount: number;
  reactions: Record<string, { count: number; hasReacted: boolean }>;
  replies?: FeedPost[];
}

interface DealItem {
  id: string; company_id: string | null; external_company_name: string | null;
  external_description: string | null; external_sector: string | null;
  external_stage: string | null; external_raise_amount: number | null;
  external_docs_url: string | null; pinned: boolean; created_at: string;
  sharedByName: string; commentCount: number; myInterest: string | null;
  company: { company_name: string; slug: string; ai_score: number | null;
    sector: string | null; stage: string | null; raising_amount: number | null; logo_url: string | null } | null;
  interestBreakdown: { pass: number; watching: number; interested: number; committed: number };
}

interface Member {
  id: string; userId: string; role: string; status: string;
  name: string | null; email: string | null; joinedAt: string;
}

const EMOJIS = [
  { emoji: '👍', icon: ThumbsUp },
  { emoji: '🔥', icon: Flame },
  { emoji: '💡', icon: Lightbulb },
  { emoji: '❓', icon: HelpCircle },
]

const INTEREST_OPTIONS = [
  { value: 'pass', label: 'Pass', color: 'bg-gray-100 text-gray-600' },
  { value: 'watching', label: 'Watching', color: 'bg-blue-100 text-blue-700' },
  { value: 'interested', label: 'Interested', color: 'bg-amber-100 text-amber-700' },
  { value: 'committed', label: 'Committed', color: 'bg-emerald-100 text-emerald-700' },
]

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-700',
  deal_lead: 'bg-blue-100 text-blue-700',
  member: 'bg-gray-100 text-gray-600',
  observer: 'bg-gray-50 text-gray-400',
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatAmount(amount: number | null): string {
  if (!amount) return ''
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount}`
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CommunityHubPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'feed' | 'deals' | 'members'>('feed')

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/communities/${slug}`)
      if (res.status === 403) {
        setError('not_member')
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError('not_found')
        setLoading(false)
        return
      }
      const data = await res.json()
      setCommunity(data.community)
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#007CF8]" />
      </div>
    )
  }

  if (error === 'not_member') {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Members Only</h1>
        <p className="text-gray-500 mb-6">You don&apos;t have access to this community. Ask an admin for an invite.</p>
        <button onClick={() => router.push('/communities')} className="text-sm text-[#007CF8] hover:underline">Back to Communities</button>
      </div>
    )
  }

  if (!community || error) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Community Not Found</h1>
        <button onClick={() => router.push('/communities')} className="text-sm text-[#007CF8] hover:underline">Back to Communities</button>
      </div>
    )
  }

  const isAdmin = community.userRole === 'admin'
  const tabs = [
    { key: 'feed' as const, label: 'Feed' },
    { key: 'deals' as const, label: `Deals (${community.dealCount})` },
    { key: 'members' as const, label: `Members (${community.memberCount})` },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{community.name}</h1>
            {community.description && <p className="text-gray-500 mt-1">{community.description}</p>}
            {community.thesis && <p className="text-sm text-[#007CF8] mt-1 italic">{community.thesis}</p>}
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
              <span>{community.memberCount} members</span>
              <span>·</span>
              <span>{community.dealCount} active deals</span>
              <span>·</span>
              <span className="capitalize">{community.mode} mode</span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                href={`/communities/${slug}/settings`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'feed' && <FeedTab slug={slug} community={community} />}
      {activeTab === 'deals' && <DealsTab slug={slug} community={community} />}
      {activeTab === 'members' && <MembersTab slug={slug} community={community} />}
    </div>
  )
}

// ─── Feed Tab ────────────────────────────────────────────────────────────────

function FeedTab({ slug, community }: { slug: string; community: Community }) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const loadFeed = useCallback(async () => {
    const res = await fetch(`/api/communities/${slug}/feed`)
    if (res.ok) {
      const data = await res.json()
      setPosts(data.posts || [])
    }
    setLoading(false)
  }, [slug])

  useEffect(() => { loadFeed() }, [loadFeed])

  async function handlePost() {
    if (!newPost.trim() || posting) return
    setPosting(true)
    const res = await fetch(`/api/communities/${slug}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newPost.trim() }),
    })
    if (res.ok) {
      setNewPost('')
      loadFeed()
    }
    setPosting(false)
  }

  async function handleReply(parentId: string) {
    if (!replyContent.trim()) return
    const res = await fetch(`/api/communities/${slug}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyContent.trim(), parentId }),
    })
    if (res.ok) {
      setReplyContent('')
      setReplyingTo(null)
      loadFeed()
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
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: data.reactions } : p))
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('Delete this post?')) return
    const res = await fetch(`/api/communities/${slug}/posts/${postId}`, { method: 'DELETE' })
    if (res.ok) loadFeed()
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>

  return (
    <div>
      {/* Post composer */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <textarea
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none"
          placeholder="Share an update with the community..."
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handlePost}
            disabled={!newPost.trim() || posting}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No posts yet. Be the first to share something!</div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              community={community}
              onReact={(emoji) => handleReact(post.id, emoji)}
              onDelete={() => handleDelete(post.id)}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onReply={() => handleReply(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PostCard({
  post, community, onReact, onDelete, replyingTo, setReplyingTo, replyContent, setReplyContent, onReply,
}: {
  post: FeedPost; community: Community; onReact: (emoji: string) => void; onDelete: () => void;
  replyingTo: string | null; setReplyingTo: (id: string | null) => void;
  replyContent: string; setReplyContent: (c: string) => void; onReply: () => void;
}) {
  const isAdmin = community.userRole === 'admin'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#007CF8]/10 flex items-center justify-center text-xs font-semibold text-[#007CF8]">
            {(post.authorName || '?')[0].toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900">{post.authorName}</span>
            <span className="text-xs text-gray-400 ml-2">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        {isAdmin && (
          <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>

      {/* Reactions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {EMOJIS.map(({ emoji, icon: Icon }) => {
          const r = post.reactions[emoji]
          return (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition ${
                r?.hasReacted ? 'bg-[#007CF8]/10 text-[#007CF8]' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {r?.count ? r.count : ''}
            </button>
          )
        })}
        <button
          onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-50 text-gray-400 hover:bg-gray-100 transition"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {post.replyCount > 0 ? post.replyCount : ''} Reply
        </button>
      </div>

      {/* Reply input */}
      {replyingTo === post.id && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onReply()}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
            placeholder="Write a reply..."
            autoFocus
          />
          <button onClick={onReply} disabled={!replyContent.trim()} className="px-3 py-2 bg-[#007CF8] text-white text-sm rounded-lg hover:bg-[#0066D6] disabled:opacity-50">Reply</button>
        </div>
      )}
    </div>
  )
}

// ─── Deals Tab ───────────────────────────────────────────────────────────────

function DealsTab({ slug, community }: { slug: string; community: Community }) {
  const [deals, setDeals] = useState<DealItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareMode, setShareMode] = useState<'kunfa' | 'external' | null>(null)

  // Kunfa search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; company_name: string; slug: string; ai_score: number | null }>>([])
  const [searching, setSearching] = useState(false)

  // External deal form
  const [extName, setExtName] = useState('')
  const [extDesc, setExtDesc] = useState('')
  const [extSector, setExtSector] = useState('')
  const [extStage, setExtStage] = useState('')
  const [extAmount, setExtAmount] = useState('')
  const [extDocs, setExtDocs] = useState('')

  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')

  const loadDeals = useCallback(async () => {
    const res = await fetch(`/api/communities/${slug}/deals`)
    if (res.ok) {
      const data = await res.json()
      setDeals(data.deals || [])
    }
    setLoading(false)
  }, [slug])

  useEffect(() => { loadDeals() }, [loadDeals])

  const canShare = community.userRole === 'admin' || community.userRole === 'deal_lead' || community.deal_sharing === 'all_members'

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    const res = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`)
    if (res.ok) {
      const data = await res.json()
      setSearchResults(data.companies || [])
    }
    setSearching(false)
  }

  async function handleShareKunfa(companyId: string) {
    setShareLoading(true)
    const res = await fetch(`/api/communities/${slug}/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    })
    if (res.ok) {
      setShowShareModal(false)
      setShareMode(null)
      setSearchQuery('')
      setSearchResults([])
      loadDeals()
    } else {
      const data = await res.json()
      setShareError(data.error || 'Failed to share deal')
    }
    setShareLoading(false)
  }

  async function handleShareExternal(e: React.FormEvent) {
    e.preventDefault()
    if (!extName.trim()) { setShareError('Company name is required'); return }
    setShareLoading(true)
    setShareError('')
    const res = await fetch(`/api/communities/${slug}/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalCompanyName: extName.trim(),
        externalDescription: extDesc || null,
        externalSector: extSector || null,
        externalStage: extStage || null,
        externalRaiseAmount: extAmount ? parseInt(extAmount) : null,
        externalDocsUrl: extDocs || null,
      }),
    })
    if (res.ok) {
      setShowShareModal(false)
      setShareMode(null)
      setExtName(''); setExtDesc(''); setExtSector(''); setExtStage(''); setExtAmount(''); setExtDocs('')
      loadDeals()
    } else {
      const data = await res.json()
      setShareError(data.error || 'Failed to share deal')
    }
    setShareLoading(false)
  }

  async function handleInterest(dealId: string, status: string) {
    const res = await fetch(`/api/communities/${slug}/deals/${dealId}/interest`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) loadDeals()
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>

  return (
    <div>
      {canShare && (
        <div className="mb-4">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] transition"
          >
            <TrendingUp className="w-4 h-4" />
            Share a Deal
          </button>
        </div>
      )}

      {deals.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No deals shared yet.</div>
      ) : (
        <div className="space-y-3">
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} slug={slug} onInterest={(status) => handleInterest(deal.id, status)} />
          ))}
        </div>
      )}

      {/* Share Deal Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share a Deal</h3>
              <button onClick={() => { setShowShareModal(false); setShareMode(null); setShareError('') }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!shareMode ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShareMode('kunfa')}
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-[#007CF8] transition"
                >
                  <div className="font-medium text-gray-900">From Kunfa</div>
                  <div className="text-sm text-gray-500">Search for a company already on the platform</div>
                </button>
                <button
                  onClick={() => setShareMode('external')}
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-[#007CF8] transition"
                >
                  <div className="font-medium text-gray-900">External Deal</div>
                  <div className="text-sm text-gray-500">Add a company not yet on Kunfa</div>
                </button>
              </div>
            ) : shareMode === 'kunfa' ? (
              <div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                    placeholder="Search company name..."
                    autoFocus
                  />
                </div>
                {searching && <div className="text-center py-3 text-gray-400 text-sm">Searching...</div>}
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleShareKunfa(c.id)}
                      disabled={shareLoading}
                      className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{c.company_name}</div>
                      </div>
                      {c.ai_score && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          c.ai_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          c.ai_score >= 60 ? 'bg-blue-100 text-blue-700' :
                          c.ai_score >= 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {c.ai_score}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShareMode(null)} className="text-sm text-gray-500 hover:text-gray-700 mt-3">← Back</button>
              </div>
            ) : (
              <form onSubmit={handleShareExternal} className="space-y-3">
                <input type="text" value={extName} onChange={e => setExtName(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                  placeholder="Company name *" />
                <textarea value={extDesc} onChange={e => setExtDesc(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none"
                  placeholder="Description" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={extSector} onChange={e => setExtSector(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]">
                    <option value="">Sector</option>
                    {['Fintech', 'SaaS', 'Healthtech', 'E-commerce', 'Edtech', 'Logistics', 'AI/ML', 'Cleantech', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={extStage} onChange={e => setExtStage(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]">
                    <option value="">Stage</option>
                    {['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <input type="number" value={extAmount} onChange={e => setExtAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                  placeholder="Raise amount (USD)" />
                <input type="url" value={extDocs} onChange={e => setExtDocs(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                  placeholder="Docs URL (optional)" />
                {shareError && <p className="text-red-600 text-sm">{shareError}</p>}
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => setShareMode(null)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
                  <button type="submit" disabled={shareLoading} className="px-4 py-2 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] disabled:opacity-50">
                    {shareLoading ? 'Sharing...' : 'Share Deal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DealCard({ deal, slug, onInterest }: { deal: DealItem; slug: string; onInterest: (status: string) => void }) {
  const [showInterest, setShowInterest] = useState(false)
  const name = deal.company?.company_name || deal.external_company_name || 'Unknown'
  const sector = deal.company?.sector || deal.external_sector
  const stage = deal.company?.stage || deal.external_stage
  const amount = deal.company?.raising_amount || deal.external_raise_amount
  const score = deal.company?.ai_score
  const total = deal.interestBreakdown.pass + deal.interestBreakdown.watching + deal.interestBreakdown.interested + deal.interestBreakdown.committed

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {deal.company?.logo_url ? (
            <img src={deal.company.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-400">
              {name[0]}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              {deal.company ? (
                <Link href={`/company/${deal.company.slug}`} className="font-semibold text-gray-900 hover:text-[#007CF8]">{name}</Link>
              ) : (
                <span className="font-semibold text-gray-900">{name}</span>
              )}
              {score != null && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  score >= 60 ? 'bg-blue-100 text-blue-700' :
                  score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>{score}</span>
              )}
              {deal.external_docs_url && (
                <a href={deal.external_docs_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#007CF8]">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              {sector && <span>{sector}</span>}
              {sector && stage && <span>·</span>}
              {stage && <span>{stage}</span>}
              {amount ? <><span>·</span><span className="font-medium text-gray-700">{formatAmount(amount)}</span></> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/communities/${slug}/deals/${deal.id}`}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#007CF8]"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {deal.commentCount}
          </Link>
        </div>
      </div>

      {deal.external_description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{deal.external_description}</p>
      )}

      {/* Interest bar */}
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-2">
          {deal.interestBreakdown.pass > 0 && <div className="bg-gray-300" style={{ flex: deal.interestBreakdown.pass }} />}
          {deal.interestBreakdown.watching > 0 && <div className="bg-blue-400" style={{ flex: deal.interestBreakdown.watching }} />}
          {deal.interestBreakdown.interested > 0 && <div className="bg-amber-400" style={{ flex: deal.interestBreakdown.interested }} />}
          {deal.interestBreakdown.committed > 0 && <div className="bg-emerald-400" style={{ flex: deal.interestBreakdown.committed }} />}
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Shared by {deal.sharedByName} · {timeAgo(deal.created_at)}</span>
        <div className="relative">
          <button
            onClick={() => setShowInterest(!showInterest)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition ${
              deal.myInterest
                ? INTEREST_OPTIONS.find(o => o.value === deal.myInterest)?.color || 'bg-gray-100 text-gray-600'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {deal.myInterest ? INTEREST_OPTIONS.find(o => o.value === deal.myInterest)?.label : 'Set Interest'}
            <ChevronDown className="w-3 h-3 inline ml-1" />
          </button>
          {showInterest && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-10 w-36">
              {INTEREST_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onInterest(opt.value); setShowInterest(false) }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${deal.myInterest === opt.value ? 'font-medium text-[#007CF8]' : 'text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab({ slug, community }: { slug: string; community: Community }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const isAdmin = community.userRole === 'admin'

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/communities/${slug}/members`)
    if (res.ok) {
      const data = await res.json()
      setMembers(data.members || [])
    }
    setLoading(false)
  }, [slug])

  useEffect(() => { loadMembers() }, [loadMembers])

  async function handleInvite() {
    const emails = inviteEmails.split(/[,\n]+/).map(e => e.trim()).filter(e => e.includes('@'))
    if (emails.length === 0) return
    setInviteLoading(true)
    const res = await fetch(`/api/communities/${slug}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    })
    if (res.ok) {
      const data = await res.json()
      setInviteResult(`${data.invited} invited${data.alreadyMembers > 0 ? `, ${data.alreadyMembers} already members` : ''}`)
      setInviteEmails('')
      loadMembers()
    }
    setInviteLoading(false)
  }

  async function handleRoleChange(userId: string, role: string) {
    setActionLoading(userId)
    await fetch(`/api/communities/${slug}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    loadMembers()
    setActionLoading(null)
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member from the community?')) return
    setActionLoading(userId)
    const res = await fetch(`/api/communities/${slug}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) loadMembers()
    else {
      const data = await res.json()
      alert(data.error || 'Failed to remove')
    }
    setActionLoading(null)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>

  return (
    <div>
      {isAdmin && (
        <div className="mb-4">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] transition"
          >
            <UserPlus className="w-4 h-4" />
            Invite Members
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-[#F8F9FB]">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Member</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
              {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-[#F8F9FB]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#007CF8]/10 flex items-center justify-center text-xs font-semibold text-[#007CF8]">
                      {(m.name || m.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{m.name || 'Pending'}</div>
                      <div className="text-xs text-gray-400">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isAdmin && m.status === 'active' ? (
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.userId, e.target.value)}
                      disabled={actionLoading === m.userId}
                      className={`text-xs font-medium px-2 py-0.5 rounded border-0 ${ROLE_BADGES[m.role] || 'bg-gray-100 text-gray-600'}`}
                    >
                      <option value="admin">Admin</option>
                      <option value="deal_lead">Deal Lead</option>
                      <option value="member">Member</option>
                      <option value="observer">Observer</option>
                    </select>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${ROLE_BADGES[m.role] || 'bg-gray-100 text-gray-600'}`}>
                      {m.role.replace('_', ' ')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.joinedAt).toLocaleDateString()}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    {m.status === 'active' && (
                      <button
                        onClick={() => handleRemove(m.userId)}
                        disabled={actionLoading === m.userId}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invite Members</h3>
              <button onClick={() => { setShowInviteModal(false); setInviteResult(null) }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <textarea
              value={inviteEmails}
              onChange={e => setInviteEmails(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none"
              placeholder={"ahmed@example.com\nsarah@example.com"}
            />
            <p className="text-xs text-gray-400 mt-1 mb-3">One email per line or comma-separated</p>
            {inviteResult && <p className="text-sm text-emerald-600 mb-3">{inviteResult}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowInviteModal(false); setInviteResult(null) }} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="px-4 py-2 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] disabled:opacity-50"
              >
                {inviteLoading ? 'Sending...' : 'Send Invites'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
