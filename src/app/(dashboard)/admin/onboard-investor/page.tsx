'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { useTenant, useTenantFeature } from '@/components/TenantProvider';

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  job_title: string;
  fund_name: string;
  linkedin_url: string;
  bio: string;
  sector_interests: string[];
  stage_focus: string[];
  check_size_min: string;
  check_size_max: string;
  geographic_focus: string;
  is_accredited: boolean;
  accreditation_type: string;
  verification_notes: string;
}

const EMPTY: FormData = {
  full_name: '', email: '', phone: '', country: '',
  job_title: '', fund_name: '', linkedin_url: '', bio: '',
  sector_interests: [], stage_focus: [], check_size_min: '', check_size_max: '', geographic_focus: '',
  is_accredited: false, accreditation_type: '', verification_notes: '',
};

const STEPS = ['Personal', 'Professional', 'Investment', 'Accreditation', 'Review'];
const SECTORS = ['Fintech', 'Healthtech', 'SaaS', 'Climate', 'Consumer', 'AI', 'Marketplace', 'Deep Tech'];
const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'];

export default function OnboardInvestorPage() {
  const router = useRouter();
  const { isTenantContext, isLoading } = useTenant();
  const hasFeature = useTenantFeature('onboard_investor');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isTenantContext) { setIsAdmin(false); return; }
    fetch('/api/tenant/admin-check')
      .then((r) => r.ok ? r.json() : { isAdmin: false })
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [isTenantContext]);

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleArr = (k: 'sector_interests' | 'stage_focus', v: string) => {
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/tenant/onboard-investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to submit');
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/admin/invitations'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
      setSubmitting(false);
    }
  };

  if (isLoading || isAdmin === null) {
    return <div className="p-8 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" /></div>;
  }

  if (!isTenantContext || !hasFeature) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">Feature not available</h1>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="p-8 max-w-4xl mx-auto text-center"><h1 className="text-xl font-semibold">Admin access required</h1></div>;
  }

  if (success) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Invitation sent</h1>
        <p className="text-sm text-gray-500 mt-2">{form.full_name} will receive an email to join your network.</p>
      </div>
    );
  }

  const canNext = step === 0 ? !!form.full_name && !!form.email : true;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Onboard Investor</h1>
        <p className="text-gray-500 text-sm mt-1">Invite a new investor to your network</p>
      </div>

      <div className="flex items-center justify-between mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className={`flex items-center gap-2`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                i < step ? 'bg-[#007CF8] text-white' : i === step ? 'bg-[#007CF8] text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden md:inline ${i === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-[#007CF8]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Personal</h2>
            <Field label="Full Name *" value={form.full_name} onChange={(v) => update('full_name', v)} />
            <Field label="Email *" type="email" value={form.email} onChange={(v) => update('email', v)} />
            <Field label="Phone" value={form.phone} onChange={(v) => update('phone', v)} />
            <Field label="Country" value={form.country} onChange={(v) => update('country', v)} />
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Professional</h2>
            <Field label="Job Title" value={form.job_title} onChange={(v) => update('job_title', v)} />
            <Field label="Firm / Fund Name" value={form.fund_name} onChange={(v) => update('fund_name', v)} />
            <Field label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => update('linkedin_url', v)} />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Investment Profile</h2>
            <MultiSelect label="Sector Interests" values={form.sector_interests} options={SECTORS} onToggle={(v) => toggleArr('sector_interests', v)} />
            <MultiSelect label="Stage Focus" values={form.stage_focus} options={STAGES} onToggle={(v) => toggleArr('stage_focus', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check Size Min (USD)" type="number" value={form.check_size_min} onChange={(v) => update('check_size_min', v)} />
              <Field label="Check Size Max (USD)" type="number" value={form.check_size_max} onChange={(v) => update('check_size_max', v)} />
            </div>
            <Field label="Geographic Focus" value={form.geographic_focus} onChange={(v) => update('geographic_focus', v)} />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Accreditation</h2>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_accredited} onChange={(e) => update('is_accredited', e.target.checked)} />
              <span className="text-sm text-gray-700">Accredited investor</span>
            </label>
            {form.is_accredited && (
              <>
                <Field label="Accreditation Type" value={form.accreditation_type} onChange={(v) => update('accreditation_type', v)} />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Verification Notes</label>
                  <textarea value={form.verification_notes} onChange={(e) => update('verification_notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900 mb-4">Review</h2>
            <Row label="Name" value={form.full_name} />
            <Row label="Email" value={form.email} />
            <Row label="Firm" value={form.fund_name} />
            <Row label="Sectors" value={form.sector_interests.join(', ')} />
            <Row label="Stages" value={form.stage_focus.join(', ')} />
            <Row label="Check Size" value={form.check_size_min || form.check_size_max ? `$${form.check_size_min} – $${form.check_size_max}` : '—'} />
            <Row label="Accredited" value={form.is_accredited ? 'Yes' : 'No'} />
            {error && <div className="text-sm text-red-600 p-3 rounded bg-red-50 border border-red-200">{error}</div>}
          </div>
        )}

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="inline-flex items-center gap-1 px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] disabled:opacity-50">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="inline-flex items-center gap-1 px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] disabled:opacity-50">
              {submitting ? 'Sending…' : 'Send Invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" />
    </div>
  );
}

function MultiSelect({ label, values, options, onToggle }: { label: string; values: string[]; options: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.includes(o);
          return (
            <button key={o} type="button" onClick={() => onToggle(o)} className={`text-xs px-2.5 py-1 rounded-full border ${active ? 'bg-[#007CF8] text-white border-[#007CF8]' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  );
}
