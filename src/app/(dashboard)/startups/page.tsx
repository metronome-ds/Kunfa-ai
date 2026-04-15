'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Rocket, MapPin } from 'lucide-react';
import { useTenant, useTenantFeature } from '@/components/TenantProvider';

interface Startup {
  id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  one_liner: string | null;
  industry: string | null;
  stage: string | null;
  founder_name: string | null;
  country: string | null;
  overall_score: number | null;
  is_raising: boolean | null;
  raise_amount: number | null;
  created_at: string;
}

function ScoreRing({ score }: { score: number | null }) {
  const v = score ?? 0;
  const color = v >= 80 ? '#10B981' : v >= 60 ? '#007CF8' : v >= 40 ? '#F59E0B' : '#9CA3AF';
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (v / 100) * circumference;
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" stroke="#E5E7EB" strokeWidth="3" fill="none" />
        <circle cx="22" cy="22" r="18" stroke={color} strokeWidth="3" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">{score ?? '—'}</span>
    </div>
  );
}

export default function StartupsPage() {
  const { isTenantContext, isLoading } = useTenant();
  const hasFeature = useTenantFeature('startup_directory');
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('');
  const [sort, setSort] = useState('score');

  useEffect(() => {
    if (!isTenantContext) return;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (industry) params.set('industry', industry);
      if (stage) params.set('stage', stage);
      if (sort) params.set('sort', sort);
      try {
        const res = await fetch(`/api/tenant/startups?${params.toString()}`);
        if (res.ok) {
          const d = await res.json();
          setStartups(d.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [isTenantContext, search, industry, stage, sort]);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" /></div>;
  }

  if (!isTenantContext) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-xl font-semibold text-gray-900">Startup Directory</h1>
        <p className="text-sm text-gray-500 mt-2">This page is only available in a tenant context.</p>
      </div>
    );
  }

  if (!hasFeature) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <Rocket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">Feature not available</h1>
        <p className="text-sm text-gray-500 mt-2">The startup directory is not enabled for this tenant.</p>
      </div>
    );
  }

  const industries = Array.from(new Set(startups.map((s) => s.industry).filter(Boolean))) as string[];
  const stages = Array.from(new Set(startups.map((s) => s.stage).filter(Boolean))) as string[];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Startups</h1>
        <p className="text-gray-500 text-sm mt-1">Explore startups in your network</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search startups..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" />
        </div>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">All industries</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">All stages</option>
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="score">Top score</option>
          <option value="newest">Newest</option>
          <option value="name">Name</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8] mx-auto" /></div>
      ) : startups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Rocket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">No startups yet</h2>
          <p className="text-sm text-gray-500 mt-1">Startups in your network will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {startups.map((s) => (
            <Link key={s.id} href={`/company/${s.slug}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition">
              <div className="flex items-start gap-3 mb-3">
                {s.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo_url} alt={s.company_name} className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-[#007CF8] font-bold">
                    {s.company_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{s.company_name}</h3>
                  {s.one_liner && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{s.one_liner}</p>}
                </div>
                <ScoreRing score={s.overall_score} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {s.industry && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{s.industry}</span>}
                {s.stage && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{s.stage}</span>}
                {s.is_raising && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Raising</span>}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span className="truncate">{s.founder_name || '—'}</span>
                {s.country && <span className="flex items-center gap-1 flex-shrink-0"><MapPin className="w-3 h-3" />{s.country}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
