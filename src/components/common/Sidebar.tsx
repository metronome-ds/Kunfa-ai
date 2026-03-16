'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  TrendingUp,
  Users,
  Building2,
  FolderOpen,
  Handshake,
  Gift,
  Star,
  LayoutDashboard,
  Landmark,
  PlusCircle,
  Bookmark,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KunfaLogo from '@/components/common/KunfaLogo';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
}

// Investor navigation — clean and focused
const investorNavSections: Record<string, NavItem[]> = {
  OVERVIEW: [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: '/dashboard',
    },
  ],
  DISCOVER: [
    {
      label: 'Browse Companies',
      icon: <Compass className="h-5 w-5" />,
      href: '/deals',
    },
  ],
  'DEAL FLOW': [
    {
      label: 'Add Company',
      icon: <PlusCircle className="h-5 w-5" />,
      href: '/companies/new',
    },
    {
      label: 'Pipeline',
      icon: <TrendingUp className="h-5 w-5" />,
      href: '/pipeline',
    },
    {
      label: 'Saved Deals',
      icon: <Bookmark className="h-5 w-5" />,
      href: '/saved-deals',
    },
  ],
};

const investorBottomSections: NavItem[] = [
  {
    label: 'Team',
    icon: <Users className="h-5 w-5" />,
    href: '/team',
  },
  {
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings',
  },
];

// Startup navigation sections
const startupNavSections: Record<string, NavItem[]> = {
  'MY COMPANY': [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: '/dashboard',
    },
    {
      label: 'Company Profile',
      icon: <Building2 className="h-5 w-5" />,
      href: '/company-profile',
    },
    {
      label: 'Data Room',
      icon: <FolderOpen className="h-5 w-5" />,
      href: '/data-room',
    },
  ],
  FUNDING: [
    {
      label: 'Investors',
      icon: <Users className="h-5 w-5" />,
      href: '/investors',
    },
    {
      label: 'Debt Partners',
      icon: <Landmark className="h-5 w-5" />,
      href: '/debt-partners',
    },
  ],
  REWARDS: [
    {
      label: 'Points',
      icon: <Star className="h-5 w-5" />,
      href: '/points',
    },
    {
      label: 'Rewards Catalog',
      icon: <Gift className="h-5 w-5" />,
      href: '/rewards',
    },
  ],
};

const startupBottomSections: NavItem[] = [
  {
    label: 'Team',
    icon: <Users className="h-5 w-5" />,
    href: '/team',
  },
  {
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings',
  },
];

interface SidebarSectionProps {
  title: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
}

function SidebarSection({ title, items, pathname, collapsed }: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (collapsed) {
    return (
      <div className="mb-2 space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.label}
              href={item.href || '#'}
              className={`flex items-center justify-center p-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              title={item.label}
            >
              {item.icon}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-400 hover:text-gray-300 transition-colors uppercase tracking-wider"
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {isExpanded && (
        <div className="space-y-1 mt-2">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.label}
                href={item.href || '#'}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          setUserRole(profile?.role || 'investor');
        }
      } catch (err) {
        console.error('Error loading user role:', err);
        setUserRole('investor');
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const isStartup = userRole === 'founder' || userRole === 'startup';
  const navigationSections = isStartup ? startupNavSections : investorNavSections;
  const bottomSections = isStartup ? startupBottomSections : investorBottomSections;
  const tagline = isStartup ? 'Startup Growth Platform' : 'Deal Flow Intelligence';

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`border-b border-gray-800 ${collapsed ? 'p-3 flex items-center justify-center' : 'p-6'}`}>
        <Link href="/dashboard" className="block hover:opacity-80 transition-opacity">
          {collapsed ? (
            <span className="text-white font-bold text-lg">K</span>
          ) : (
            <KunfaLogo height={24} inverted />
          )}
        </Link>
        {!collapsed && <p className="text-xs text-gray-400 mt-2">{tagline}</p>}
      </div>

      {/* Navigation */}
      <div className={`flex-1 overflow-y-auto py-4 space-y-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
          </div>
        ) : (
          Object.entries(navigationSections).map(([title, items]) => (
            <SidebarSection key={title} title={title} items={items} pathname={pathname} collapsed={collapsed} />
          ))
        )}
      </div>

      {/* Bottom */}
      <div className={`border-t border-gray-800 ${collapsed ? 'p-2' : 'p-3'} space-y-3`}>
        <div className="space-y-1">
          {bottomSections.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.label}
                href={item.href || '#'}
                className={`flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'} rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'} rounded-lg text-gray-300 hover:bg-red-600/10 hover:text-red-400 transition-all`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>

        {/* Toggle button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
