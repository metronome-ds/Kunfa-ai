'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, Users, UserPlus, Clock, Rocket, Briefcase } from 'lucide-react';
import { useTenant } from '@/components/TenantProvider';
import { tenantFetch } from '@/lib/tenant-fetch';

interface Stats {
  capital_deployed: number;
  active_deals: number;
  network_size: number;
  new_this_month: number;
}

interface ActivityItem {
  id: string;
  type: 'startup' | 'investor' | 'deal';
  text: string;
  time: string;
  href?: string;
}

function formatCompact(n: number): string {
  if (!n) return '$0';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const activityIcon = (type: string) => {
  if (type === 'startup') return <Rocket className="w-4 h-4 text-blue-600" />;
  if (type === 'investor') return <Users className="w-4 h-4 text-emerald-600" />;
  return <Briefcase className="w-4 h-4 text-purple-600" />;
};

export default function WwipDashboard() {
  const { tenant } = useTenant();
  const [stats, setStats] = useState<Stats>({ capital_deployed: 0, active_deals: 0, network_size: 0, new_this_month: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await tenantFetch('/api/tenant/dashboard');
        if (res.ok) {
          const d = await res.json();
          setStats(d.stats);
          setActivity(d.recent_activity || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const displayName = tenant?.display_name || tenant?.name || 'Your Network';

  const cards = [
    { label: 'Capital Deployed', value: formatCompact(stats.capital_deployed), icon: <DollarSign className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-100' },
    { label: 'Active Deals', value: stats.active_deals.toString(), icon: <TrendingUp className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100' },
    { label: 'Network Size', value: stats.network_size.toString(), icon: <Users className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-100' },
    { label: 'New This Month', value: stats.new_this_month.toString(), icon: <UserPlus className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-100' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{displayName} Dashboard</h1>
        <p className="text-gray-500 mt-1">{tenant?.tagline || 'Overview of your network activity'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{c.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {loading ? <span className="text-gray-300">—</span> : c.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-lg ${c.bg}`}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Recent Activity</h2>
        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8] mx-auto" />
          </div>
        ) : activity.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No recent activity yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activity.map((item) => {
              const content = (
                <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                    {activityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.time)}</p>
                  </div>
                </div>
              );
              return item.href ? (
                <Link key={item.id} href={item.href} className="block hover:bg-[#F8F9FB] -mx-2 px-2 rounded-lg transition">
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
