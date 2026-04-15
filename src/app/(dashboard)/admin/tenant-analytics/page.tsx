'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Users, Rocket, Briefcase, DollarSign, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTenant } from '@/components/TenantProvider';

interface Overview {
  total_members: number;
  total_startups: number;
  total_deals: number;
  total_capital: number;
}
interface Bucket { month: string; count: number }
interface Funnel { stage: string; count: number }
interface TopDeal { id: string; company_name: string; slug: string | null; score: number | null; raise_amount: number | null }
interface Pair { sector?: string; stage?: string; count: number }
interface Analytics {
  overview: Overview;
  member_growth: Bucket[];
  deal_flow_funnel: Funnel[];
  top_deals: TopDeal[];
  sector_breakdown: Pair[];
  stage_breakdown: Pair[];
}

const COLORS = ['#007CF8', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

function formatCompact(n: number): string {
  if (!n) return '$0';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const body = rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
  return [headers.join(','), ...body].join('\n');
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TenantAnalyticsPage() {
  const { isTenantContext, isLoading } = useTenant();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isTenantContext) { setIsAdmin(false); return; }
    fetch('/api/tenant/admin-check')
      .then((r) => r.ok ? r.json() : { isAdmin: false })
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [isTenantContext]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/tenant/analytics')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (isLoading || isAdmin === null) {
    return <div className="p-8 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" /></div>;
  }

  if (!isTenantContext) {
    return <div className="p-8 max-w-4xl mx-auto text-center"><h1 className="text-xl font-semibold text-gray-900">Tenant context required</h1></div>;
  }

  if (!isAdmin) {
    return <div className="p-8 max-w-4xl mx-auto text-center"><h1 className="text-xl font-semibold">Admin access required</h1></div>;
  }

  if (loading || !data) {
    return <div className="p-8 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" /></div>;
  }

  const cards = [
    { label: 'Total Members', value: data.overview.total_members.toString(), icon: <Users className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-100' },
    { label: 'Total Startups', value: data.overview.total_startups.toString(), icon: <Rocket className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100' },
    { label: 'Total Deals', value: data.overview.total_deals.toString(), icon: <Briefcase className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-100' },
    { label: 'Total Capital', value: formatCompact(data.overview.total_capital), icon: <DollarSign className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-100' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Insights into your network activity</p>
        </div>
        <BarChart3 className="w-8 h-8 text-gray-300" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{c.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{c.value}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${c.bg}`}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Member Growth */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Member Growth</h2>
            <button onClick={() => downloadCsv('member-growth.csv', data.member_growth as unknown as Record<string, unknown>[])} className="text-xs text-gray-400 hover:text-gray-700"><Download className="w-4 h-4" /></button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.member_growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#007CF8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Deal Flow Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Deal Flow Funnel</h2>
            <button onClick={() => downloadCsv('deal-funnel.csv', data.deal_flow_funnel as unknown as Record<string, unknown>[])} className="text-xs text-gray-400 hover:text-gray-700"><Download className="w-4 h-4" /></button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.deal_flow_funnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} stroke="#9CA3AF" width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#007CF8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sector Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sector Breakdown</h2>
            <button onClick={() => downloadCsv('sector-breakdown.csv', data.sector_breakdown as unknown as Record<string, unknown>[])} className="text-xs text-gray-400 hover:text-gray-700"><Download className="w-4 h-4" /></button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.sector_breakdown} dataKey="count" nameKey="sector" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {data.sector_breakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stage Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Stage Breakdown</h2>
            <button onClick={() => downloadCsv('stage-breakdown.csv', data.stage_breakdown as unknown as Record<string, unknown>[])} className="text-xs text-gray-400 hover:text-gray-700"><Download className="w-4 h-4" /></button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.stage_breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Deals */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Top Deals by Score</h2>
          <button onClick={() => downloadCsv('top-deals.csv', data.top_deals as unknown as Record<string, unknown>[])} className="text-xs text-gray-400 hover:text-gray-700"><Download className="w-4 h-4" /></button>
        </div>
        {data.top_deals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No scored deals yet</p>
        ) : (
          <table className="w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/50">
              <tr>
                {['Company', 'Score', 'Raise'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.top_deals.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {d.slug ? <Link href={`/company/${d.slug}`} className="hover:text-[#007CF8]">{d.company_name}</Link> : d.company_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{d.score ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{d.raise_amount ? formatCompact(Number(d.raise_amount)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
