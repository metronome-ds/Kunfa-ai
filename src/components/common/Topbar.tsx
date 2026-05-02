'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell, Settings } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/deals': 'Deals',
  '/pipeline': 'Pipeline',
  '/services': 'Marketplace',
  '/communities': 'Community',
  '/startups': 'Startups',
  '/investors': 'Investors',
  '/investors-directory': 'Investors',
  '/invitations': 'Invitations',
  '/faq': 'FAQ',
  '/settings': 'Settings',
  '/team': 'Team',
  '/onboarding': 'Founder Onboarding',
  '/companies/new': 'Add Company',
  '/saved-deals': 'Saved Deals',
  '/admin/tenants': 'Tenants',
  '/admin/analytics': 'Analytics',
  '/admin/onboard-startup': 'Onboard Startup',
  '/admin/onboard-investor': 'Onboard Investor',
  '/admin/invitations': 'Invitations',
  '/admin/tenant-analytics': 'Analytics',
};

function getPageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.startsWith('/company/')) return 'Company';
  if (pathname.startsWith('/admin/')) return 'Admin';
  return 'Kunfa';
}

export function Topbar() {
  const pathname = usePathname();
  const label = getPageLabel(pathname);

  return (
    <div
      className="flex items-center justify-between sticky top-0 z-10"
      style={{
        padding: '16px var(--page-px)',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
        backdropFilter: 'blur(8px)',
        height: 'var(--topbar-h)',
      }}
    >
      {/* Breadcrumbs */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--ink-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Kunfa &nbsp;/&nbsp; <span style={{ color: 'var(--ink)' }}>{label}</span>
      </div>

      {/* Right: search + icon buttons */}
      <div className="flex items-center gap-[14px]">
        <div
          className="flex items-center gap-2"
          style={{
            background: 'var(--bg-sunk)',
            border: '1px solid var(--line)',
            padding: '7px 12px',
            borderRadius: 6,
            width: 280,
            color: 'var(--ink-mute)',
            fontSize: 12,
          }}
        >
          <Search size={14} />
          <span className="flex-1">Search deals, people, companies...</span>
          <kbd
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              padding: '1px 5px',
              borderRadius: 3,
              color: 'var(--ink-soft)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        <button
          className="grid place-items-center transition-colors"
          style={{
            width: 32, height: 32, borderRadius: 6,
            color: 'var(--ink-soft)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sunk)'; e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
        >
          <Bell size={16} />
        </button>

        <button
          className="grid place-items-center transition-colors"
          style={{
            width: 32, height: 32, borderRadius: 6,
            color: 'var(--ink-soft)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sunk)'; e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
