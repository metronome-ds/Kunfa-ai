'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FeatureGate from '@/components/common/FeatureGate'
import { Users, Plus, TrendingUp, Loader2, MessageCircle, Sparkles, Compass, Eye, CheckCircle, Calendar, ArrowRight } from 'lucide-react'
import { canAccessFeature } from '@/lib/subscription'
import { PageHead, Tabs, StatCard, Card, Tag, Button, EmptyState, LinkText } from '@/components/ui/design-system'

interface CommunityItem {
  id: string; name: string; slug: string; description: string | null;
  thesis: string | null; mode: string; memberCount: number; dealCount: number; userRole: string;
}

export default function CommunitiesPage() {
  const router = useRouter()
  const [communities, setCommunities] = useState<CommunityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tier, setTier] = useState('free')
  const [tab, setTab] = useState('discussions')

  useEffect(() => {
    async function load() {
      const [commRes, tierRes] = await Promise.all([
        fetch('/api/communities'),
        fetch('/api/subscription'),
      ])
      if (commRes.ok) {
        const data = await commRes.json()
        setCommunities(data.communities || [])
      }
      if (tierRes.ok) {
        const data = await tierRes.json()
        setTier(data.tier || 'free')
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--ink-mute)' }} />
      </div>
    )
  }

  const hasAccess = canAccessFeature(tier, 'create_community')

  if (!hasAccess && communities.length === 0) {
    return (
      <FeatureGate feature="create_community">
        <div />
      </FeatureGate>
    )
  }

  const TABS = [
    { id: 'discussions', label: 'Discussions', icon: <MessageCircle size={14} /> },
    { id: 'events', label: 'Events', icon: <Calendar size={14} /> },
    { id: 'sense-check', label: 'Sense Check', icon: <CheckCircle size={14} /> },
    { id: 'screen-startup', label: 'Screen a Startup', icon: <Eye size={14} /> },
  ]

  // Show the new community design when user has communities
  if (communities.length > 0) {
    return (
      <div>
        <PageHead
          title="Community"
          subtitle="Where Kunfa members trade diligence, intel, and signal. Curated threads from operators, investors, and analysts."
          cta={
            hasAccess ? (
              <Button variant="primary" href="/communities/create" icon={<Plus size={13} />}>
                New Discussion
              </Button>
            ) : undefined
          }
        />

        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {/* 3-column stat row */}
        <div className="stat-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Members" value={String(communities.reduce((s, c) => s + c.memberCount, 0))} icon={<Users size={14} />} />
          <StatCard label="Discussions this week" value={String(communities.reduce((s, c) => s + c.dealCount, 0))} icon={<MessageCircle size={14} />} />
          <StatCard label="Communities" value={String(communities.length)} icon={<TrendingUp size={14} />} />
        </div>

        {/* Two-column layout */}
        <div className="community-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
          {/* Left: Community list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>Your communities</h2>
              <LinkText href="/communities" icon={<ArrowRight size={11} />}>View all</LinkText>
            </div>
            <Card style={{ padding: '4px 22px' }}>
              {communities.map((c) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.slug}`}
                  className="block"
                  style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr', gap: 14,
                    padding: '18px 0', borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', background: 'var(--ink)',
                    color: '#f4f3ee', display: 'grid', placeItems: 'center',
                    fontSize: 12, fontWeight: 500,
                  }}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Tag variant={c.userRole === 'admin' ? 'accent' : 'default'}>{c.userRole}</Tag>
                      <span style={{ fontSize: 12, color: 'var(--ink-mute)', textTransform: 'capitalize' }}>{c.mode}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 6 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)', display: 'flex', gap: 14, alignItems: 'center' }}>
                      <span className="flex items-center gap-1"><Users size={12} /> {c.memberCount} members</span>
                      <span className="flex items-center gap-1"><TrendingUp size={12} /> {c.dealCount} deals</span>
                    </div>
                  </div>
                </Link>
              ))}
            </Card>
          </div>

          {/* Right: Aside cards */}
          <div>
            {/* Dark aside card */}
            <Card variant="dark" style={{ padding: 22, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                width: 32, height: 32, background: 'rgba(255,255,255,0.08)', borderRadius: 6,
                display: 'grid', placeItems: 'center', color: 'var(--accent)', marginBottom: 14,
              }}>
                <Sparkles size={16} />
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, marginBottom: 6 }}>AI Deal Matching</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(244,243,238,0.7)', marginBottom: 16 }}>
                Our intelligence layer surfaces deals matched to your thesis, check size, and stage preferences.
              </div>
              <button style={{
                width: '100%', background: '#fff', color: 'var(--ink)', padding: '9px 14px',
                borderRadius: 6, fontSize: 12.5, fontWeight: 500, textAlign: 'center',
                border: 'none', cursor: 'pointer',
              }}>
                Set my preferences
              </button>
            </Card>

            {/* Light aside card */}
            <Card style={{ padding: 22 }}>
              <div style={{
                width: 32, height: 32, background: 'var(--bg-sunk)', borderRadius: 6,
                display: 'grid', placeItems: 'center', color: 'var(--ink)', marginBottom: 14,
              }}>
                <Compass size={16} />
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, marginBottom: 6 }}>Sense Check an Idea</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-soft)', marginBottom: 16 }}>
                Drop a thesis or pitch and we&apos;ll match you with the right people in the network for a fast read.
              </div>
              <button style={{
                width: '100%', background: 'var(--ink)', color: '#fff', padding: '9px 14px',
                borderRadius: 6, fontSize: 12.5, fontWeight: 500, textAlign: 'center',
                border: 'none', cursor: 'pointer',
              }}>
                Start a sense check
              </button>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Has access but no communities — empty state
  return (
    <div>
      <PageHead
        title="Community"
        subtitle="Where Kunfa members trade diligence, intel, and signal."
      />
      <EmptyState
        icon={<Users size={20} />}
        title="No communities yet"
        description="Create a private deal-sharing space for your investor network."
      />
      {hasAccess && (
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Button variant="primary" href="/communities/create" icon={<Plus size={13} />}>
            Create Community
          </Button>
        </div>
      )}
    </div>
  )
}
