'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardShell } from '@/components/common/DashboardShell';

interface OptionalSidebarLayoutProps {
  children: React.ReactNode;
  fallbackNav?: React.ReactNode;
}

export function OptionalSidebarLayout({ children, fallbackNav }: OptionalSidebarLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  // While checking auth, show nothing (brief flash)
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        {fallbackNav}
        {children}
      </div>
    );
  }

  if (isAuthenticated) {
    return <DashboardShell>{children}</DashboardShell>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {fallbackNav}
      {children}
    </div>
  );
}
