'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/common/Sidebar';
import { Navbar } from '@/components/common/Navbar';
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
    <div className="flex h-screen bg-[#F8F9FB]">
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
      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-200 ${
          mounted ? (collapsed ? 'md:ml-16' : 'md:ml-64') : 'md:ml-64'
        }`}
      >
        {/* Mobile hamburger + Navbar */}
        <div className="relative">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md border border-gray-200"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <Navbar />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto pt-16">
          <div className="min-h-screen">{children}</div>
        </div>
      </div>
    </div>
    </TenantProvider>
  );
}
