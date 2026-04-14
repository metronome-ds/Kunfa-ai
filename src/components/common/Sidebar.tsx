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
  Gift,
  Star,
  Upload,
  LayoutDashboard,
  Landmark,
  PlusCircle,
  Bookmark,
  ShieldCheck,
  BarChart3,
  Briefcase,
  FileSearch,
  PieChart,
  Calculator,
  Tag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KunfaLogo from '@/components/common/KunfaLogo';
import { isSuperAdmin } from '@/lib/super-admins';
import { canAccessFeature } from '@/lib/subscription';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  requiredTier?: string;
  tierBadge?: string;
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
  COMMUNITIES: [
    {
      label: 'Communities',
      icon: <Users className="h-5 w-5" />,
      href: '/communities',
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
  GROW: [
    {
      label: 'Services',
      icon: <Briefcase className="h-5 w-5" />,
      href: '/services',
    },
  ],
  TOOLS: [
    {
      label: 'Term Sheet Analyzer',
      icon: <FileSearch className="h-5 w-5" />,
      href: '/term-sheet-analyzer',
    },
    {
      label: 'Cap Table',
      icon: <PieChart className="h-5 w-5" />,
      href: '/cap-table',
      requiredTier: 'cap_table',
      tierBadge: 'GROWTH',
    },
    {
      label: 'Valuation Calculator',
      icon: <Calculator className="h-5 w-5" />,
      href: '/valuation-calculator',
      requiredTier: 'valuation_calculator',
      tierBadge: 'GROWTH',
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

function TierBadge({ text }: { text: string }) {
  return (
    <span className="bg-[#007CF8] text-white text-[10px] rounded px-1.5 py-0.5 font-medium leading-none">
      {text}
    </span>
  );
}

interface SidebarSectionProps {
  title: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  userTier: string;
}

function SidebarSection({ title, items, pathname, collapsed, userTier }: SidebarSectionProps) {
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
                  ? 'bg-[#F0F7FF] text-[#007CF8]'
                  : 'text-[#4B5563] hover:bg-[#F8F9FB] hover:text-[#111827]'
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
        className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold text-[#9CA3AF] hover:text-[#4B5563] transition-colors uppercase tracking-wider"
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {isExpanded && (
        <div className="space-y-1 mt-1">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href + '/'));
            const showBadge = item.requiredTier && !canAccessFeature(userTier, item.requiredTier);
            return (
              <Link
                key={item.label}
                href={item.href || '#'}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#F0F7FF] text-[#007CF8] font-medium'
                    : 'text-[#4B5563] hover:bg-[#F8F9FB] hover:text-[#111827]'
                }`}
              >
                {item.icon}
                <span className="text-sm flex-1">{item.label}</span>
                {showBadge && item.tierBadge && <TierBadge text={item.tierBadge} />}
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
  const [userTier, setUserTier] = useState('free');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_admin')
            .eq('user_id', user.id)
            .single();

          setUserRole(profile?.role || 'investor');
          setIsAdmin(profile?.is_admin === true);
          setIsSuperAdminUser(isSuperAdmin(user.email));

          // Fetch tier
          try {
            const tierRes = await fetch('/api/subscription');
            if (tierRes.ok) {
              const tierData = await tierRes.json();
              setUserTier(tierData.tier || 'free');
            }
          } catch {
            // Default to free
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setUserRole('investor');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
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
      className={`fixed left-0 top-0 h-screen bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`border-b border-[#E5E7EB] ${collapsed ? 'p-3 flex items-center justify-center' : 'p-6'}`}>
        <Link href="/dashboard" className="block hover:opacity-80 transition-opacity">
          {collapsed ? (
            <span className="text-[#111827] font-bold text-lg">K</span>
          ) : (
            <KunfaLogo height={24} />
          )}
        </Link>
        {!collapsed && <p className="text-xs text-[#9CA3AF] mt-2">{tagline}</p>}
      </div>

      {/* Navigation */}
      <div className={`flex-1 overflow-y-auto py-4 space-y-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#9CA3AF]"></div>
          </div>
        ) : (
          Object.entries(navigationSections).map(([title, items]) => (
            <SidebarSection key={title} title={title} items={items} pathname={pathname} collapsed={collapsed} userTier={userTier} />
          ))
        )}
      </div>

      {/* Bottom */}
      <div className={`border-t border-[#E5E7EB] ${collapsed ? 'p-2' : 'p-3'} space-y-3`}>
        <div className="space-y-1">
          {isSuperAdminUser && (
            <Link
              href="/admin/analytics"
              className={`flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'} rounded-lg transition-all ${
                pathname === '/admin/analytics'
                  ? 'bg-[#F0F7FF] text-[#007CF8] font-medium'
                  : 'text-[#4B5563] hover:bg-[#F8F9FB] hover:text-[#111827]'
              }`}
              title={collapsed ? 'Analytics' : undefined}
            >
              <BarChart3 className="h-5 w-5" />
              {!collapsed && <span className="text-sm">Analytics</span>}
            </Link>
          )}
          {isAdmin && (
            <>
              <Link
                href="/admin/claims"
                className={`flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'} rounded-lg transition-all ${
                  pathname === '/admin/claims'
                    ? 'bg-[#F0F7FF] text-[#007CF8] font-medium'
                    : 'text-[#4B5563] hover:bg-[#F8F9FB] hover:text-[#111827]'
                }`}
                title={collapsed ? 'Claims' : undefined}
              >
                <ShieldCheck className="h-5 w-5" />
                {!collapsed && <span className="text-sm">Claims</span>}
              </Link>
              <Link
                href="/admin/imports"
                className={`flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'} rounded-lg transition-all ${
                  pathname === '/admin/imports'
                    ? 'bg-[#F0F7FF] text-[#007CF8] font-medium'
                    : 'text-[#4B5563] hover:bg-[#F8F9FB] hover:text-[#111827]'
                }`}
                title={collapsed ? 'Imports' : undefined}
              >
                <Upload className="h-5 w-5" />
                {!collapsed && <span className="text-sm">Imports</span>}
              </Link>
              <Link
                href="/admin/promo-codes"
                className={`flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'} rounded-lg transition-all ${
                  pathname === '/admin/promo-codes'
                    ? 'bg-[#F0F7FF] text-[#007CF8] font-medium'
                    : 'text-[#4B5563] hover:bg-[#F8F9FB] hover:text-[#111827]'
                }`}
                title={collapsed ? 'Promo Codes' : undefined}
              >
                <Tag className="h-5 w-5" />
                {!collapsed && <span className="text-sm">Promo Codes</span>}
              </Link>
            </>
          )}
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
                    ? 'bg-[#F0F7FF] text-[#007CF8] font-medium'
                    : 'text-[#4B5563] hover:bg-[#F8F9FB] hover:text-[#111827]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'} rounded-lg text-[#4B5563] hover:bg-red-50 hover:text-[#EF4444] transition-all`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>

        {/* Toggle button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F8F9FB] transition-all"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
