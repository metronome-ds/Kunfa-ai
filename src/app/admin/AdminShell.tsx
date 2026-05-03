'use client'

import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { usePathname } from 'next/navigation'
import { Search, Bell } from 'lucide-react'

const ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Platform Overview',
  '/admin/tenants': 'Tenants',
  '/admin/users': 'Users',
  '/admin/claims': 'Claims',
  '/admin/imports': 'Imports',
  '/admin/promo-codes': 'Promo Codes',
  '/admin/audit-log': 'Audit Log',
  '/admin/settings': 'Settings',
  '/admin/onboard-startup': 'Onboard Startup',
  '/admin/onboard-investor': 'Onboard Investor',
  '/admin/invitations': 'Invitations',
  '/admin/tenant-analytics': 'Tenant Analytics',
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const label = ROUTE_LABELS[pathname] || 'Admin'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr', minHeight: '100vh', background: 'var(--bg)' }}>
      <AdminSidebar />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Admin topbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 40px', borderBottom: '1px solid var(--line)',
          background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10,
          backdropFilter: 'blur(8px)', height: 56,
        }}>
          <div style={{ fontSize: 12, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Admin &nbsp;/&nbsp; <span style={{ color: 'var(--ink)' }}>{label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-sunk)', border: '1px solid var(--line)',
              padding: '7px 12px', borderRadius: 6, width: 240, color: 'var(--ink-mute)', fontSize: 12,
            }}>
              <Search size={14} />
              <span>Search admin...</span>
            </div>
            <button style={{ width: 32, height: 32, borderRadius: 6, display: 'grid', placeItems: 'center', color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Bell size={16} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main style={{ padding: '32px 40px 80px', maxWidth: 1280, width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
