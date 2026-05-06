'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Building2, Briefcase, TrendingUp, CreditCard } from 'lucide-react'

interface PlatformStats {
  users: number
  companies: number
  deals: number
  entities: number
  subscriptions: number
}

interface RecentUser {
  id: string
  full_name: string | null
  email: string
  role: string | null
  created_at: string
}

interface RecentDeal {
  id: string
  company_name: string | null
  stage: string
  created_at: string
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats>({ users: 0, companies: 0, deals: 0, entities: 0, subscriptions: 0 })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setStats({
            users: d.totalUsers || 0,
            companies: d.totalCompanies || 0,
            deals: d.totalDeals || 0,
            entities: d.totalEntities || 0,
            subscriptions: d.activeSubscriptions || 0,
          })
          setRecentUsers(d.recentUsers || [])
          setRecentDeals(d.recentDeals || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    { label: 'Total Users', value: stats.users, icon: <Users size={14} />, href: '/admin/users' },
    { label: 'Companies', value: stats.companies, icon: <Building2 size={14} />, href: '/admin/companies' },
    { label: 'Deals', value: stats.deals, icon: <Briefcase size={14} />, href: '/admin/deals' },
    { label: 'Entities', value: stats.entities, icon: <TrendingUp size={14} />, href: '/admin/tenants' },
    { label: 'Active Subs', value: stats.subscriptions, icon: <CreditCard size={14} />, href: '/admin/subscriptions' },
  ]

  return (
    <div>
      {/* Page head */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
        marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 38, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Platform Overview
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
            Global metrics across all tenants, entities, and users.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 40 }}>
        {cards.map((c) => (
          <Link key={c.label} href={c.href} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
            <div style={{
              background: 'var(--bg-elev)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)', padding: '20px 22px',
              display: 'flex', flexDirection: 'column', gap: 14,
              transition: 'border-color 120ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-mute)' }}>
                <span>{c.label}</span>
                <span style={{ opacity: 0.6 }}>{c.icon}</span>
              </div>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 34, letterSpacing: '-0.02em',
                lineHeight: 1, fontVariantNumeric: 'tabular-nums',
              }}>
                {loading ? '—' : c.value.toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two columns: Recent users + Recent deals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent users */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>Recent signups</h2>
            <Link href="/admin/users" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Loading...</div>
            ) : recentUsers.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>No users yet</div>
            ) : (
              recentUsers.slice(0, 8).map((u, i) => (
                <div key={u.id} style={{
                  padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: i < recentUsers.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.full_name || 'No name'}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{u.email}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'capitalize' }}>{u.role || '—'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent deals */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>Recent deals</h2>
          </div>
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Loading...</div>
            ) : recentDeals.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>No deals yet</div>
            ) : (
              recentDeals.slice(0, 8).map((d, i) => (
                <div key={d.id} style={{
                  padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: i < recentDeals.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{d.company_name || 'Unknown'}</div>
                  <div style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                    background: 'var(--bg-sunk)', color: 'var(--ink-soft)', textTransform: 'capitalize',
                  }}>{d.stage}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
