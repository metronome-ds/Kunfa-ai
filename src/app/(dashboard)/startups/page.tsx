'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Rocket, MapPin, Trash2, Lock } from 'lucide-react';
import { useTenant, useTenantFeature } from '@/components/TenantProvider';
import { tenantFetch } from '@/lib/tenant-fetch';
import { DeleteCompanyModal } from '@/components/company/DeleteCompanyModal';
import { SourceBadge } from '@/components/common/SourceBadge';

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
  source?: string | null;
  is_public?: boolean | null;
  claim_status?: string | null;
  claim_invited_email?: string | null;
}

function ScoreRing({ score }: { score: number | null }) {
  const v = score ?? 0;
  const color = v >= 80 ? '#10B981' : v >= 60 ? 'var(--accent)' : v >= 40 ? '#F59E0B' : '#9CA3AF';
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (v / 100) * circumference;
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" stroke="#E5E7EB" strokeWidth="3" fill="none" />
        <circle cx="22" cy="22" r="18" stroke={color} strokeWidth="3" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--ink)]">{score ?? '—'}</span>
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!isTenantContext) return;
    tenantFetch('/api/tenant/admin-check')
      .then((r) => r.ok ? r.json() : { isAdmin: false })
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => {});
  }, [isTenantContext]);

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
        const res = await tenantFetch(`/api/tenant/startups?${params.toString()}`);
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
    return <div className="p-8 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--line-strong)]" /></div>;
  }

  if (!isTenantContext) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Startup Directory</h1>
        <p className="text-sm text-[var(--ink-mute)] mt-2">This page is only available in a tenant context.</p>
      </div>
    );
  }

  if (!hasFeature) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <Rocket className="w-10 h-10 text-[var(--ink-faint)] mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-[var(--ink)]">Feature not available</h1>
        <p className="text-sm text-[var(--ink-mute)] mt-2">The startup directory is not enabled for this tenant.</p>
      </div>
    );
  }

  const industries = Array.from(new Set(startups.map((s) => s.industry).filter(Boolean))) as string[];
  const stages = Array.from(new Set(startups.map((s) => s.stage).filter(Boolean))) as string[];

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
        marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 38, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 8 }}>Startups</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Every Kunfa-onboarded company. Verified, scored, and updated quarterly.</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-mute)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search startups..." style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid var(--line-strong)', borderRadius: 5, fontSize: 13, background: 'var(--bg)', color: 'var(--ink)', outline: 'none' }} />
        </div>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="px-3 py-2 border border-[var(--line)] rounded-lg text-sm">
          <option value="">All industries</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="px-3 py-2 border border-[var(--line)] rounded-lg text-sm">
          <option value="">All stages</option>
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 border border-[var(--line)] rounded-lg text-sm">
          <option value="score">Top score</option>
          <option value="newest">Newest</option>
          <option value="name">Name</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--line-strong)] mx-auto" /></div>
      ) : startups.length === 0 ? (
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-12 text-center">
          <Rocket className="w-10 h-10 text-[var(--ink-faint)] mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[var(--ink)]">No startups yet</h2>
          <p className="text-sm text-[var(--ink-mute)] mt-1">Startups in your network will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 md:grid-cols-3 gap-4">
          {startups.map((s) => (
            <Link key={s.id} href={`/company/${s.slug}`} className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-5 hover:border-[var(--line-strong)] hover:shadow-sm transition">
              <div className="flex items-start gap-3 mb-3">
                {s.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo_url} alt={s.company_name} className="w-12 h-12 rounded-lg object-cover border border-[var(--line)]" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-ink)] font-bold">
                    {s.company_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--ink)] truncate">{s.company_name}</h3>
                  {s.one_liner && <p className="text-xs text-[var(--ink-mute)] line-clamp-2 mt-0.5">{s.one_liner}</p>}
                </div>
                <ScoreRing score={s.overall_score} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {s.industry && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--ink)]">{s.industry}</span>}
                {s.stage && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{s.stage}</span>}
                {s.is_raising && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Raising</span>}
                <SourceBadge source={s.source} />
                {s.is_public === false && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-sunk)] text-[var(--ink-soft)]">
                    <Lock className="w-3 h-3" />Private
                  </span>
                )}
                {s.claim_status && s.claim_status !== 'claimed' && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    s.claim_status === 'invite_sent' ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
                    : s.claim_status === 'pending' ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-orange-50 text-orange-700'
                  }`}>
                    {s.claim_status === 'invite_sent' ? 'Invite Sent'
                     : s.claim_status === 'pending' ? 'Pending Review'
                     : 'Unclaimed'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--ink-mute)] pt-2 border-t border-[var(--line)]">
                <span className="truncate">{s.founder_name || '—'}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.country}</span>}
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: s.id, name: s.company_name }); }}
                      className="p-1 text-[var(--ink-faint)] hover:text-red-500 transition rounded"
                      title="Delete company"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {deleteTarget && (
        <DeleteCompanyModal
          companyId={deleteTarget.id}
          companyName={deleteTarget.name}
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setStartups((prev) => prev.filter((s) => s.id !== deleteTarget.id));
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
