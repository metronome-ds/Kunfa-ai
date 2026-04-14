'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FeatureGate from '@/components/common/FeatureGate'
import { Users, Plus, TrendingUp, Loader2 } from 'lucide-react'
import { canAccessFeature } from '@/lib/subscription'

interface CommunityItem {
  id: string; name: string; slug: string; description: string | null;
  thesis: string | null; mode: string; memberCount: number; dealCount: number; userRole: string;
}

export default function CommunitiesPage() {
  const router = useRouter()
  const [communities, setCommunities] = useState<CommunityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tier, setTier] = useState('free')

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
        <Loader2 className="w-6 h-6 animate-spin text-[#007CF8]" />
      </div>
    )
  }

  // Users without Fund tier see FeatureGate upgrade prompt
  const hasAccess = canAccessFeature(tier, 'create_community')

  if (!hasAccess && communities.length === 0) {
    return (
      <FeatureGate feature="create_community">
        <div />
      </FeatureGate>
    )
  }

  // Users with communities: show list
  if (communities.length > 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Communities</h1>
          {hasAccess && (
            <Link
              href="/communities/create"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] transition"
            >
              <Plus className="w-4 h-4" />
              Create Community
            </Link>
          )}
        </div>

        <div className="grid gap-4">
          {communities.map(c => (
            <Link
              key={c.id}
              href={`/communities/${c.slug}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#007CF8]/30 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{c.name}</h2>
                  {c.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
                  {c.thesis && <p className="text-sm text-[#007CF8] mt-1 italic">{c.thesis}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                  c.userRole === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {c.userRole}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.memberCount} members</span>
                <span>·</span>
                <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{c.dealCount} deals</span>
                <span>·</span>
                <span className="capitalize">{c.mode}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Has access but no communities
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#007CF8]/10 flex items-center justify-center mx-auto mb-6">
        <Users className="w-8 h-8 text-[#007CF8]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Kunfa Communities</h1>
      <p className="text-gray-500 max-w-md mx-auto mb-6">
        Create a private deal-sharing space for your investor network. Replace WhatsApp groups with structured deal flow.
      </p>
      <Link
        href="/communities/create"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#007CF8] text-white font-medium rounded-lg hover:bg-[#0066D6] transition"
      >
        <Plus className="w-5 h-5" />
        Create Your First Community
      </Link>
    </div>
  )
}
