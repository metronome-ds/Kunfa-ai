'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/common/Sidebar';
import { Topbar } from '@/components/common/Topbar';
import { TenantProvider } from '@/components/TenantProvider';

const STORAGE_KEY = 'kunfa-sidebar-collapsed';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
    setMounted(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <TenantProvider>
      <div
        className="min-h-screen"
        style={{
          display: 'grid',
          gridTemplateColumns: mounted
            ? `${collapsed ? '64px' : 'var(--sidebar-w)'} 1fr`
            : 'var(--sidebar-w) 1fr',
          background: 'var(--bg)',
        }}
      >
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>

        {/* Mobile overlay sidebar */}
        {mobileOpen && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
            <div className="fixed left-0 top-0 h-full z-50 md:hidden">
              <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="min-w-0 flex flex-col md:col-start-2">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-lg border"
            style={{ background: 'var(--bg-elev)', borderColor: 'var(--line)' }}
          >
            <Menu className="w-5 h-5" style={{ color: 'var(--ink-soft)' }} />
          </button>

          {/* Topbar */}
          <Topbar />

          {/* Page content */}
          <main
            style={{
              padding: 'var(--page-pt) var(--page-px) var(--page-pb)',
              maxWidth: 'var(--page-max)',
              width: '100%',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
