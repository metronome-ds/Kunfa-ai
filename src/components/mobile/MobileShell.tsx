'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, MessageCircle, Mail, User, Search, Bell, ChevronLeft } from 'lucide-react'

// ---------------------------------------------------------------------------
// Mobile Nav Header — matches m-shell.jsx NavHeader
// ---------------------------------------------------------------------------

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Kunfa',
  '/deals': 'Deals',
  '/communities': 'Community',
  '/invitations': 'Invitations',
  '/settings': 'Profile',
  '/faq': 'FAQ',
  '/team': 'Team',
  '/pipeline': 'Pipeline',
  '/startups': 'Startups',
  '/investors': 'Investors',
}

export function MobileNavHeader() {
  const pathname = usePathname()
  const title = ROUTE_TITLES[pathname] || 'Kunfa'
  const isSubpage = !ROUTE_TITLES[pathname] && pathname !== '/dashboard'

  return (
    <div style={{
      padding: '8px 20px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      background: 'var(--bg)',
    }}>
      {isSubpage ? (
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 15, color: 'var(--ink)', fontWeight: 500,
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <ChevronLeft size={18} />
          Back
        </button>
      ) : (
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--bg-sunk)', display: 'grid', placeItems: 'center',
          color: 'var(--ink)', border: 'none', cursor: 'pointer',
        }}>
          <Search size={16} />
        </button>
        <button style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--bg-sunk)', display: 'grid', placeItems: 'center',
          color: 'var(--ink)', border: 'none', cursor: 'pointer',
        }}>
          <Bell size={16} />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile Tab Bar — matches m-shell.jsx TabBar
// ---------------------------------------------------------------------------

const TABS = [
  { label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Deals', icon: Briefcase, href: '/deals' },
  { label: 'Community', icon: MessageCircle, href: '/communities' },
  { label: 'Invites', icon: Mail, href: '/invitations' },
  { label: 'Profile', icon: User, href: '/settings' },
]

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--line)',
      padding: '8px 4px 22px',
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
    }}>
      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href + '/'))
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4, padding: '4px 0',
              color: active ? 'var(--ink)' : 'var(--ink-mute)',
              fontSize: 10, letterSpacing: '0.02em', fontWeight: 500,
              textDecoration: 'none', position: 'relative',
            }}
          >
            {active && (
              <span style={{
                position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)',
              }} />
            )}
            <Icon size={22} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
