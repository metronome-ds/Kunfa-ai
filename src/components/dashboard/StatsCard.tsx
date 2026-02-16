'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  isLoading?: boolean;
}

const colorClasses = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  red: { bg: 'bg-red-100', text: 'text-red-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
};

export function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  isLoading = false,
}: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {isLoading ? (
            <div className="mt-3 h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          )}
          {trend && !isLoading && (
            <p
              className={cn(
                'text-xs font-medium mt-2',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', colors.bg)}>
          <Icon className={cn('h-6 w-6', colors.text)} />
        </div>
      </div>
    </div>
  );
}
