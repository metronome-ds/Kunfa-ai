'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'red';
}

interface QuickActionsProps {
  actions: QuickActionProps[];
  isLoading?: boolean;
}

const colorClasses = {
  blue: 'hover:bg-blue-50 border-blue-100',
  green: 'hover:bg-green-50 border-green-100',
  purple: 'hover:bg-purple-50 border-purple-100',
  orange: 'hover:bg-orange-50 border-orange-100',
  indigo: 'hover:bg-indigo-50 border-indigo-100',
  red: 'hover:bg-red-50 border-red-100',
};

const iconColorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  indigo: 'text-indigo-600',
  red: 'text-red-600',
};

function ActionCard({ title, description, icon: Icon, href, color }: QuickActionProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          'bg-white rounded-xl shadow-sm p-6 border cursor-pointer transition-all hover:shadow-md',
          colorClasses[color]
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <Icon className={cn('h-5 w-5', iconColorClasses[color])} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function QuickActions({ actions, isLoading = false }: QuickActionsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {actions.map((action) => (
        <ActionCard key={action.href} {...action} />
      ))}
    </div>
  );
}
