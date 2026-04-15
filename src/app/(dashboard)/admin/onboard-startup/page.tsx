'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Rocket } from 'lucide-react';
import { useTenant, useTenantFeature } from '@/components/TenantProvider';
import { tenantFetch } from '@/lib/tenant-fetch';

interface FormData {
  company_name: string;
  one_liner: string;
  description: string;
  website_url: string;
  logo_url: string;
  industry: string;
  stage: string;
  country: string;
  headquarters: string;
  founder_name: string;
  founder_title: string;
  founder_email: string;
  linkedin_url: string;
  is_raising: boolean;
  raise_amount: string;
  raising_instrument: string;
  raising_target_close: string;
  pitch_deck_url: string;
  financials_url: string;
}

const EMPTY: FormData = {
  company_name: '', one_liner: '', description: '', website_url: '', logo_url: '',
  industry: '', stage: '', country: '', headquarters: '',
  founder_name: '', founder_title: '', founder_email: '', linkedin_url: '',
  is_raising: false, raise_amount: '', raising_instrument: '', raising_target_close: '',
  pitch_deck_url: '', financials_url: '',
};

const STEPS = ['Company', 'Classification', 'Founder', 'Fundraising', 'Documents', 'Review'];

const STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];
const INSTRUMENTS = ['SAFE', 'Equity', 'Convertible Note', 'Other'];

export default function OnboardStartupPage() {
  const router = useRouter();
  const { isTenantContext, isLoading } = useTenant();
  const hasFeature = useTenantFeature('onboard_startup');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTenantContext) { setIsAdmin(false); return; }
    tenantFetch('/api/tenant/admin-check')
      .then((r) => r.ok ? r.json() : { isAdmin: false })
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [isTenantContext]);

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await tenantFetch('/api/tenant/onboard-startup', {
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
      const d = await res.json();
      router.push(`/company/${d.company.slug}`);
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
        <Rocket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">Feature not available</h1>
        <p className="text-sm text-gray-500 mt-2">Onboard startup is not enabled for this tenant.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-xl font-semibold text-gray-900">Admin access required</h1>
        <p className="text-sm text-gray-500 mt-2">Only tenant admins can onboard startups.</p>
      </div>
    );
  }

  const canNext = (() => {
    if (step === 0) return !!form.company_name;
    return true;
  })();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Onboard Startup</h1>
        <p className="text-gray-500 text-sm mt-1">Add a new startup to your network</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${i > 0 ? 'ml-1' : ''}`}>
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
            <h2 className="font-semibold text-gray-900">Company Basics</h2>
            <Input label="Company Name *" value={form.company_name} onChange={(v) => update('company_name', v)} />
            <Input label="One-liner" value={form.one_liner} onChange={(v) => update('one_liner', v)} placeholder="What does the company do in one sentence?" />
            <Textarea label="Description" value={form.description} onChange={(v) => update('description', v)} />
            <Input label="Website URL" value={form.website_url} onChange={(v) => update('website_url', v)} placeholder="https://..." />
            <Input label="Logo URL" value={form.logo_url} onChange={(v) => update('logo_url', v)} placeholder="https://..." />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Classification</h2>
            <Input label="Industry / Sector" value={form.industry} onChange={(v) => update('industry', v)} placeholder="e.g. Fintech" />
            <Select label="Stage" value={form.stage} onChange={(v) => update('stage', v)} options={['', ...STAGES]} />
            <Input label="Country" value={form.country} onChange={(v) => update('country', v)} />
            <Input label="Headquarters" value={form.headquarters} onChange={(v) => update('headquarters', v)} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Founder</h2>
            <Input label="Founder Name" value={form.founder_name} onChange={(v) => update('founder_name', v)} />
            <Input label="Founder Title" value={form.founder_title} onChange={(v) => update('founder_title', v)} />
            <Input label="Founder Email" type="email" value={form.founder_email} onChange={(v) => update('founder_email', v)} />
            <Input label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => update('linkedin_url', v)} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Fundraising</h2>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_raising} onChange={(e) => update('is_raising', e.target.checked)} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Currently raising</span>
            </label>
            {form.is_raising && (
              <>
                <Input label="Raise Amount (USD)" type="number" value={form.raise_amount} onChange={(v) => update('raise_amount', v)} />
                <Select label="Instrument" value={form.raising_instrument} onChange={(v) => update('raising_instrument', v)} options={['', ...INSTRUMENTS]} />
                <Input label="Target Close Date" type="date" value={form.raising_target_close} onChange={(v) => update('raising_target_close', v)} />
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Documents</h2>
            <p className="text-xs text-gray-500">Paste URLs to the documents (upload UI not wired here — use existing Data Room after creation).</p>
            <Input label="Pitch Deck URL" value={form.pitch_deck_url} onChange={(v) => update('pitch_deck_url', v)} />
            <Input label="Financials URL" value={form.financials_url} onChange={(v) => update('financials_url', v)} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900 mb-4">Review</h2>
            <ReviewRow label="Company" value={form.company_name} />
            <ReviewRow label="One-liner" value={form.one_liner} />
            <ReviewRow label="Industry" value={form.industry} />
            <ReviewRow label="Stage" value={form.stage} />
            <ReviewRow label="Location" value={[form.headquarters, form.country].filter(Boolean).join(', ')} />
            <ReviewRow label="Founder" value={form.founder_name} />
            <ReviewRow label="Founder Email" value={form.founder_email} />
            <ReviewRow label="Raising" value={form.is_raising ? `Yes — $${form.raise_amount} ${form.raising_instrument}` : 'No'} />
            {error && <div className="text-sm text-red-600 p-3 rounded bg-red-50 border border-red-200">{error}</div>}
          </div>
        )}

        {/* Nav Buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-1 px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-1 px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" />
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]" />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]">
        {options.map((o) => <option key={o} value={o}>{o || 'Select...'}</option>)}
      </select>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  );
}
