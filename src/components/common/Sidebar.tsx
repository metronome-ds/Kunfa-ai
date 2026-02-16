'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  LogOut,
  ChevronDown,
  Compass,
  TrendingUp,
  Zap,
  Calculator,
  Users,
  BarChart3,
  Brain,
  FileText,
  PieChart,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
}

const navigationSections: Record<string, NavItem[]> = {
  DISCOVER: [
    {
      label: 'Browse Deals',
      icon: <Compass className="h-5 w-5" />,
      href: '/deals',
    },
    {
      label: 'People',
      icon: <Users className="h-5 w-5" />,
      href: '/people',
    },
    {
      label: 'Services',
      icon: <PieChart className="h-5 w-5" />,
      href: '/services',
    },
  ],
  'DEAL FLOW': [
    {
      label: 'Pipeline',
      icon: <TrendingUp className="h-5 w-5" />,
      href: '/pipeline',
    },
    {
      label: 'Saved Deals',
      icon: <BarChart3 className="h-5 w-5" />,
      href: '/saved-deals',
    },
    {
      label: 'Portfolio',
      icon: <PieChart className="h-5 w-5" />,
      href: '/portfolio',
    },
    {
      label: 'My Deals',
      icon: <Brain className="h-5 w-5" />,
      href: '/deals/my-deals',
    },
  ],
  'AI TOOLS': [
    {
      label: 'Deal Scorer',
      icon: <Brain className="h-5 w-5" />,
      href: '/deals',
    },
    {
      label: 'Company Briefs',
      icon: <FileText className="h-5 w-5" />,
      href: '/deals',
    },
    {
      label: 'Term Sheet',
      icon: <FileText className="h-5 w-5" />,
      href: '/deals',
    },
  ],
  FINANCIAL: [
    {
      label: 'LBO Calc',
      icon: <Calculator className="h-5 w-5" />,
      href: '/calculators/lbo',
    },
    {
      label: 'Valuation',
      icon: <Calculator className="h-5 w-5" />,
      href: '/calculators/valuation',
    },
    {
      label: 'DD Checklist',
      icon: <BarChart3 className="h-5 w-5" />,
      href: '/calculators/dd-checklist',
    },
  ],
};

const bottomSections: NavItem[] = [
  {
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings',
  },
  {
    label: 'Team',
    icon: <Users className="h-5 w-5" />,
    href: '/team',
  },
];

interface SidebarSectionProps {
  title: string;
  items: NavItem[];
  pathname: string;
}

function SidebarSection({ title, items, pathname }: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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
              pathname.startsWith(item.href + '/');
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

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
      {/* Logo and Branding */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-baseline gap-2">
          <Link href="/" className="flex items-baseline gap-2 hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold text-white">Kunfa</h1>
            <span className="text-xs font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AI
            </span>
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-1">Deal Flow Intelligence</p>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {Object.entries(navigationSections).map(([title, items]) => (
          <SidebarSection key={title} title={title} items={items} pathname={pathname} />
        ))}
      </div>

      {/* Bottom Navigation and User Section */}
      <div className="border-t border-gray-800 p-3 space-y-3">
        {/* Bottom Navigation Items */}
        <div className="space-y-1">
          {bottomSections.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + '/');
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

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-red-600/10 hover:text-red-400 transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
