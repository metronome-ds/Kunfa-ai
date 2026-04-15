'use client';

import { useEffect, useState } from 'react';
import { Search, Users, MapPin, Linkedin, CheckCircle2 } from 'lucide-react';
import { useTenant, useTenantFeature } from '@/components/TenantProvider';

interface Investor {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  fund_name: string | null;
  company_name: string | null;
  sector_interests: string[] | null;
  stage_focus: string[] | null;
  check_size_min: number | null;
  check_size_max: number | null;
  country: string | null;
  linkedin_url: string | null;
  is_accredited: boolean | null;
}

function formatCheckRange(min: number | null, max: number | null): string {
  const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`;
  if (!min && !max) return '—';
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return '—';
}

export default function InvestorsDirectoryPage() {
  const { isTenantContext, isLoading } = useTenant();
  const hasFeature = useTenantFeature('investor_directory');
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');

  useEffect(() => {
    if (!isTenantContext) return;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sector) params.set('sector', sector);
      try {
        const res = await fetch(`/api/tenant/investors?${params.toString()}`);
        if (res.ok) {
          const d = await res.json();
          setInvestors(d.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [isTenantContext, search, sector]);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" /></div>;
  }

  if (!isTenantContext) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-xl font-semibold text-gray-900">Investor Directory</h1>
        <p className="text-sm text-gray-500 mt-2">This page is only available in a tenant context.</p>
      </div>
    );
  }

  if (!hasFeature) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">Feature not available</h1>
        <p className="text-sm text-gray-500 mt-2">The investor directory is not enabled for this tenant.</p>
      </div>
    );
  }

  const allSectors = Array.from(new Set(investors.flatMap((i) => i.sector_interests || []))).filter(Boolean);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Investors</h1>
        <p className="text-gray-500 text-sm mt-1">Investors in your network</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or firm..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" />
        </div>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">All sectors</option>
          {allSectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8] mx-auto" /></div>
      ) : investors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">No investors yet</h2>
          <p className="text-sm text-gray-500 mt-1">Investors in your network will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investors.map((inv) => {
            const firm = inv.fund_name || inv.company_name;
            return (
              <div key={inv.user_id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-3 mb-3">
                  {inv.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={inv.avatar_url} alt={inv.full_name || ''} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-semibold">
                      {(inv.full_name || '?').charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-gray-900 truncate">{inv.full_name || 'Investor'}</h3>
                      {inv.is_accredited && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    </div>
                    {inv.job_title && <p className="text-xs text-gray-500 truncate">{inv.job_title}</p>}
                    {firm && <p className="text-xs font-medium text-gray-700 mt-0.5 truncate">{firm}</p>}
                  </div>
                  {inv.linkedin_url && (
                    <a href={inv.linkedin_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#0077B5] flex-shrink-0">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {inv.sector_interests && inv.sector_interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {inv.sector_interests.slice(0, 3).map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{s}</span>
                    ))}
                    {inv.sector_interests.length > 3 && <span className="text-xs text-gray-400">+{inv.sector_interests.length - 3}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>{formatCheckRange(inv.check_size_min, inv.check_size_max)}</span>
                  {inv.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{inv.country}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
