'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, Briefcase, TrendingUp,
  ShieldCheck, Upload, Tag, CreditCard, ScrollText, Settings, ArrowLeft, Shield,
} from 'lucide-react'

interface NavItem { label: string; icon: React.ReactNode; href: string }

const NAV: Record<string, NavItem[]> = {
  OVERVIEW: [
    { label: 'Platform Overview', icon: <LayoutDashboard size={15} />, href: '/admin' },
  ],
  MANAGE: [
    { label: 'Tenants', icon: <Building2 size={15} />, href: '/admin/tenants' },
    { label: 'Users', icon: <Users size={15} />, href: '/admin/users' },
    { label: 'Companies', icon: <Briefcase size={15} />, href: '/admin/companies' },
    { label: 'Deals', icon: <TrendingUp size={15} />, href: '/admin/deals' },
  ],
  TOOLS: [
    { label: 'Claims', icon: <ShieldCheck size={15} />, href: '/admin/claims' },
    { label: 'Imports', icon: <Upload size={15} />, href: '/admin/imports' },
    { label: 'Promo Codes', icon: <Tag size={15} />, href: '/admin/promo-codes' },
    { label: 'Subscriptions', icon: <CreditCard size={15} />, href: '/admin/subscriptions' },
  ],
  SYSTEM: [
    { label: 'Audit Log', icon: <ScrollText size={15} />, href: '/admin/audit-log' },
    { label: 'Settings', icon: <Settings size={15} />, href: '/admin/settings' },
  ],
}

export function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <aside style={{
      width: 248, background: 'var(--ink)', color: '#e8e7e0',
      display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
      borderRight: '1px solid var(--ink)',
    }}>
      {/* Brand */}
      <div style={{ padding: '22px 22px 18px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, background: 'var(--accent)', borderRadius: 4,
            display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)',
            fontWeight: 500, color: 'var(--ink)', fontSize: 17, lineHeight: 1,
          }}>K</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 19, letterSpacing: '-0.01em', color: '#f4f3ee', lineHeight: 1 }}>Kunfa</span>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(232,231,224,0.45)' }}>Admin Console</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {Object.entries(NAV).map(([section, items]) => (
          <div key={section}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(232,231,224,0.4)', padding: '18px 10px 8px' }}>
              {section}
            </div>
            {items.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 5, fontSize: 13, textDecoration: 'none', width: '100%',
                    color: active ? '#f4f3ee' : 'rgba(232,231,224,0.72)',
                    background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                    transition: 'background 120ms, color 120ms',
                  }}
                >
                  <span style={{ opacity: 0.85, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Exit Admin */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 18px' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
            color: 'rgba(232,231,224,0.6)', textDecoration: 'none',
            transition: 'color 120ms',
          }}
        >
          <ArrowLeft size={15} style={{ opacity: 0.7 }} />
          Exit Admin
        </Link>
      </div>
    </aside>
  )
}
