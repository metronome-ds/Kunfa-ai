'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/common/Sidebar';
import { Topbar } from '@/components/common/Topbar';
import { MobileNavHeader, MobileTabBar } from '@/components/mobile/MobileShell';
import { TenantProvider } from '@/components/TenantProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';

const STORAGE_KEY = 'kunfa-sidebar-collapsed';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
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

  // ── Mobile layout ──────────────────────────────────────────
  if (isMobile) {
    return (
      <TenantProvider>
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          <MobileNavHeader />

          {/* Mobile overlay sidebar (hamburger) */}
          {mobileOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} onClick={() => setMobileOpen(false)} />
              <div style={{ position: 'fixed', left: 0, top: 0, height: '100%', zIndex: 50 }}>
                <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
              </div>
            </>
          )}

          {/* Content — padded for tab bar */}
          <main style={{ flex: 1, paddingBottom: 96 }}>
            {children}
          </main>

          <MobileTabBar />
        </div>
      </TenantProvider>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────
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
        <div className="hidden md:block">
          <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>

        <div className="min-w-0 flex flex-col md:col-start-2">
          <Topbar />
          <main style={{
            padding: 'var(--page-pt) var(--page-px) var(--page-pb)',
            maxWidth: 'var(--page-max)',
            width: '100%',
          }}>
            {children}
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
