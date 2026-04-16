'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Rocket, Loader2 } from 'lucide-react'
import { useTenant, useTenantFeature } from '@/components/TenantProvider'
import { tenantFetch } from '@/lib/tenant-fetch'
import LogoUpload from '@/components/common/LogoUpload'
import SingleDocumentUpload from '@/components/common/SingleDocumentUpload'

interface UploadedDoc {
  url: string
  name: string
  size: number
  type: string
}

interface FormState {
  company_name: string
  one_liner: string
  description: string
  website_url: string
  logo_url: string | null
  industry: string
  stage: string
  country: string
  headquarters: string
  founder_name: string
  founder_title: string
  founder_email: string
  linkedin_url: string
  is_raising: boolean
  raise_amount: string
  raising_instrument: string
  raising_target_close: string
  pitch_deck: UploadedDoc | null
  financials: UploadedDoc | null
}

const EMPTY: FormState = {
  company_name: '',
  one_liner: '',
  description: '',
  website_url: '',
  logo_url: null,
  industry: '',
  stage: '',
  country: '',
  headquarters: '',
  founder_name: '',
  founder_title: '',
  founder_email: '',
  linkedin_url: '',
  is_raising: false,
  raise_amount: '',
  raising_instrument: '',
  raising_target_close: '',
  pitch_deck: null,
  financials: null,
}

const STEPS = ['Company', 'Classification', 'Founder', 'Fundraising', 'Documents', 'Review']

const STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth']
const INSTRUMENTS = ['SAFE', 'Equity', 'Convertible Note', 'Other']

function isHttpUrl(v: string): boolean {
  if (!v) return false
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function OnboardStartupPage() {
  const router = useRouter()
  const { isTenantContext, isLoading } = useTenant()
  const hasFeature = useTenantFeature('onboard_startup')
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)

  useEffect(() => {
    if (!isTenantContext) {
      setIsAdmin(false)
      return
    }
    tenantFetch('/api/tenant/admin-check')
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false))
  }, [isTenantContext])

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Per-step validation — returns null if valid, else user-friendly message.
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.company_name.trim() || form.company_name.trim().length < 2) {
        return 'Company name is required (min 2 characters)'
      }
      if (form.website_url && !isHttpUrl(form.website_url)) {
        return 'Website URL must start with http:// or https://'
      }
      if (form.logo_url && !isHttpUrl(form.logo_url)) {
        return 'Logo URL must be a valid http(s) URL'
      }
    }
    if (s === 2) {
      if (form.founder_email && !isEmail(form.founder_email)) {
        return 'Founder email is not valid'
      }
      if (form.linkedin_url && !isHttpUrl(form.linkedin_url)) {
        return 'LinkedIn URL must be a valid http(s) URL'
      }
    }
    if (s === 3 && form.is_raising) {
      if (form.raise_amount) {
        const n = Number(form.raise_amount)
        if (!Number.isFinite(n) || n < 0) {
          return 'Raise amount must be a positive number'
        }
      }
    }
    return null
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) {
      setStepError(err)
      return
    }
    setStepError(null)
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  const goBack = () => {
    setStepError(null)
    setStep((s) => Math.max(0, s - 1))
  }

  const submit = async () => {
    // Final validation sweep across all steps
    for (let i = 0; i < STEPS.length - 1; i++) {
      const err = validateStep(i)
      if (err) {
        setStep(i)
        setStepError(err)
        return
      }
    }

    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        company_name: form.company_name.trim(),
        one_liner: form.one_liner.trim() || null,
        description: form.description.trim() || null,
        website_url: form.website_url.trim() || null,
        logo_url: form.logo_url || null,
        industry: form.industry.trim() || null,
        stage: form.stage || null,
        country: form.country.trim() || null,
        headquarters: form.headquarters.trim() || null,
        founder_name: form.founder_name.trim() || null,
        founder_title: form.founder_title.trim() || null,
        founder_email: form.founder_email.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        is_raising: form.is_raising,
        raise_amount: form.is_raising && form.raise_amount ? Number(form.raise_amount) : null,
        raising_instrument: form.is_raising ? form.raising_instrument || null : null,
        raising_target_close: form.is_raising ? form.raising_target_close || null : null,
        pitch_deck_url: form.pitch_deck?.url || null,
        financials_url: form.financials?.url || null,
      }

      const res = await tenantFetch('/api/tenant/onboard-startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || `Failed to submit (status ${res.status})`)
        setSubmitting(false)
        return
      }
      const d = await res.json()
      // Preserve tenant context across the redirect in dev mode.
      const tenantParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('tenant')
          : null
      const target = tenantParam
        ? `/company/${d.company.slug}?tenant=${encodeURIComponent(tenantParam)}`
        : `/company/${d.company.slug}`
      router.push(target)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
      setSubmitting(false)
    }
  }

  if (isLoading || isAdmin === null) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" />
      </div>
    )
  }

  if (!isTenantContext || !hasFeature) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <Rocket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">Feature not available</h1>
        <p className="text-sm text-gray-500 mt-2">
          Onboard startup is not enabled for this tenant.
        </p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-xl font-semibold text-gray-900">Admin access required</h1>
        <p className="text-sm text-gray-500 mt-2">
          Only tenant admins can onboard startups.
        </p>
      </div>
    )
  }

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
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  i < step
                    ? 'bg-[#007CF8] text-white'
                    : i === step
                      ? 'bg-[#007CF8] text-white ring-4 ring-blue-100'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs hidden md:inline ${
                  i === step ? 'font-semibold text-gray-900' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-[#007CF8]' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Company Basics</h2>
            <Field
              label="Company Name"
              required
              value={form.company_name}
              onChange={(v) => update('company_name', v)}
            />
            <Field
              label="One-liner"
              value={form.one_liner}
              onChange={(v) => update('one_liner', v)}
              placeholder="What does the company do in one sentence?"
            />
            <TextareaField
              label="Description"
              value={form.description}
              onChange={(v) => update('description', v)}
            />
            <Field
              label="Website URL"
              type="url"
              value={form.website_url}
              onChange={(v) => update('website_url', v)}
              placeholder="https://…"
            />
            <LogoUpload
              label="Logo"
              value={form.logo_url}
              onChange={(v) => update('logo_url', v)}
              testId="logo-upload-input"
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Classification</h2>
            <Field
              label="Industry / Sector"
              value={form.industry}
              onChange={(v) => update('industry', v)}
              placeholder="e.g. Fintech"
            />
            <Select
              label="Stage"
              value={form.stage}
              onChange={(v) => update('stage', v)}
              options={['', ...STAGES]}
            />
            <Field
              label="Country"
              value={form.country}
              onChange={(v) => update('country', v)}
            />
            <Field
              label="Headquarters"
              value={form.headquarters}
              onChange={(v) => update('headquarters', v)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Founder</h2>
            <Field
              label="Founder Name"
              value={form.founder_name}
              onChange={(v) => update('founder_name', v)}
            />
            <Field
              label="Founder Title"
              value={form.founder_title}
              onChange={(v) => update('founder_title', v)}
            />
            <Field
              label="Founder Email"
              type="email"
              value={form.founder_email}
              onChange={(v) => update('founder_email', v)}
              helpText="If provided alongside invitation codes, we'll email the founder a claim link."
            />
            <Field
              label="LinkedIn URL"
              type="url"
              value={form.linkedin_url}
              onChange={(v) => update('linkedin_url', v)}
              placeholder="https://linkedin.com/in/…"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Fundraising</h2>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_raising}
                onChange={(e) => update('is_raising', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Currently raising</span>
            </label>
            {form.is_raising && (
              <>
                <Field
                  label="Raise Amount (USD)"
                  type="number"
                  value={form.raise_amount}
                  onChange={(v) => update('raise_amount', v)}
                />
                <Select
                  label="Instrument"
                  value={form.raising_instrument}
                  onChange={(v) => update('raising_instrument', v)}
                  options={['', ...INSTRUMENTS]}
                />
                <Field
                  label="Target Close Date"
                  type="date"
                  value={form.raising_target_close}
                  onChange={(v) => update('raising_target_close', v)}
                />
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Documents</h2>
            <p className="text-xs text-gray-500">
              Upload the company&apos;s pitch deck and financial documents. These will be visible
              to investors in the Data Room.
            </p>
            <SingleDocumentUpload
              label="Pitch Deck"
              value={form.pitch_deck}
              onChange={(v) => update('pitch_deck', v)}
              helpText="PDF, PPT, PPTX, or Keynote — up to 50 MB"
              testId="pitch-deck-upload-input"
            />
            <SingleDocumentUpload
              label="Financials"
              value={form.financials}
              onChange={(v) => update('financials', v)}
              helpText="XLS, XLSX, CSV, PDF — up to 50 MB"
              testId="financials-upload-input"
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900 mb-4">Review</h2>
            <Row label="Company" value={form.company_name} />
            <Row label="One-liner" value={form.one_liner} />
            <Row label="Website" value={form.website_url} />
            <Row label="Logo" value={form.logo_url ? 'Uploaded' : '—'} />
            <Row label="Industry" value={form.industry} />
            <Row label="Stage" value={form.stage} />
            <Row
              label="Location"
              value={[form.headquarters, form.country].filter(Boolean).join(', ')}
            />
            <Row label="Founder" value={form.founder_name} />
            <Row label="Founder Email" value={form.founder_email} />
            <Row
              label="Raising"
              value={
                form.is_raising
                  ? [
                      form.raise_amount ? `$${form.raise_amount}` : null,
                      form.raising_instrument || null,
                      form.raising_target_close ? `close ${form.raising_target_close}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Yes'
                  : 'No'
              }
            />
            <Row label="Pitch Deck" value={form.pitch_deck?.name || '—'} />
            <Row label="Financials" value={form.financials?.name || '—'} />
            {error && (
              <div className="text-sm text-red-700 p-3 rounded-lg bg-red-50 border border-red-200">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step-level validation error */}
        {stepError && step !== 5 && (
          <div className="mt-4 text-sm text-red-700 p-3 rounded-lg bg-red-50 border border-red-200">
            {stepError}
          </div>
        )}

        {/* Nav Buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
          <button
            onClick={goBack}
            disabled={step === 0 || submitting}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1 px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6]"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  helpText,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  helpText?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
      />
      {helpText && <p className="text-[11px] text-gray-500 mt-1">{helpText}</p>}
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
      />
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || 'Select…'}
          </option>
        ))}
      </select>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  )
}
