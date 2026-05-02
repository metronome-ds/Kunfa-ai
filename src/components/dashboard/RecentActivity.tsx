'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  timestamp: string;
  href?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

interface RecentActivityProps {
  items: ActivityItem[];
  isLoading?: boolean;
  emptyMessage?: string;
}

const colorClasses = {
  blue: 'bg-[var(--accent-soft)]',
  green: 'bg-green-100',
  purple: 'bg-purple-100',
  orange: 'bg-orange-100',
};

const iconColorClasses = {
  blue: 'text-[var(--ink)]',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
};

export function RecentActivity({
  items,
  isLoading = false,
  emptyMessage = 'No recent activity',
}: RecentActivityProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-[var(--bg-sunk)] rounded-lg animate-pulse">
            <div className="h-10 w-10 bg-[var(--bg-sunk)] rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-[var(--bg-sunk)] rounded mb-2" />
              <div className="h-3 w-48 bg-[var(--bg-sunk)] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--ink-mute)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const color = item.color || 'blue';
        const Content = (
          <div className="flex items-start gap-4 p-4 bg-[var(--bg-elev)] rounded-lg border border-[var(--line)] hover:shadow-sm transition-shadow">
            <div className={`p-2 rounded-lg flex-shrink-0 ${colorClasses[color]}`}>
              <item.icon className={`h-5 w-5 ${iconColorClasses[color]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-[var(--ink)]">{item.title}</h4>
              <p className="text-sm text-[var(--ink-soft)] mt-0.5">{item.description}</p>
              <p className="text-xs text-[var(--ink-mute)] mt-1">{formatRelativeTime(item.timestamp)}</p>
            </div>
            {item.href && <ChevronRight className="h-4 w-4 text-[var(--ink-faint)] flex-shrink-0 mt-1" />}
          </div>
        );

        if (item.href) {
          return (
            <Link key={item.id} href={item.href}>
              {Content}
            </Link>
          );
        }

        return <div key={item.id}>{Content}</div>;
      })}
    </div>
  );
}
