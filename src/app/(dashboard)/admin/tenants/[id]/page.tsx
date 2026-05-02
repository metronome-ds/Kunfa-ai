'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/supabase'
import { isSuperAdmin } from '@/lib/super-admins'
import { ArrowLeft, Save, CheckCircle } from 'lucide-react'

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tenant, setTenant] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Form state — populated from fetched tenant
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser()
      if (!user || !isSuperAdmin(user.email)) {
        router.push('/dashboard')
        return
      }

      const res = await fetch(`/api/admin/tenants/${id}`)
      if (res.ok) {
        const data = await res.json()
        setTenant(data.tenant)
        setForm(data.tenant)
      } else {
        setError('Tenant not found')
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const toggleFeature = (key: string) => {
    const features = { ...(form.features || {}) }
    features[key] = !features[key]
    updateField('features', features)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      const data = await res.json()
      setTenant(data.tenant)
      setForm(data.tenant)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--line-strong)]" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--ink-mute)]">Tenant not found</p>
        <Link href="/admin/tenants" className="text-[var(--accent-ink)] text-sm mt-2 inline-block">Back to Tenants</Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-sm text-[var(--ink-mute)] hover:text-[var(--ink-soft)] mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Tenants
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)]">{form.display_name || form.name}</h1>
          <p className="text-[var(--ink-mute)] text-sm mt-1">Tenant ID: {id}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--ink)] text-white rounded-lg font-medium text-sm hover:bg-[var(--ink-2)] transition disabled:opacity-50"
        >
          {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Basic Info */}
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Basic Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Name</label>
              <input type="text" value={form.name || ''} onChange={(e) => updateField('name', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Display Name</label>
              <input type="text" value={form.display_name || ''} onChange={(e) => updateField('display_name', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Slug</label>
              <input type="text" value={form.slug || ''} onChange={(e) => updateField('slug', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Organization Type</label>
              <input type="text" value={form.organization_type || ''} onChange={(e) => updateField('organization_type', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Tagline</label>
            <input type="text" value={form.tagline || ''} onChange={(e) => updateField('tagline', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Welcome Message</label>
            <textarea value={form.welcome_message || ''} onChange={(e) => updateField('welcome_message', e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active !== false} onChange={(e) => updateField('is_active', e.target.checked)} className="h-4 w-4 rounded border-[var(--line-strong)] text-[var(--accent-ink)]" />
              <span className="text-sm text-[var(--ink-soft)]">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.show_powered_by !== false} onChange={(e) => updateField('show_powered_by', e.target.checked)} className="h-4 w-4 rounded border-[var(--line-strong)] text-[var(--accent-ink)]" />
              <span className="text-sm text-[var(--ink-soft)]">Show &quot;Powered by Kunfa&quot;</span>
            </label>
          </div>
        </div>

        {/* Domain */}
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Domain</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Subdomain</label>
              <div className="flex items-center">
                <input type="text" value={form.subdomain || ''} onChange={(e) => updateField('subdomain', e.target.value)} placeholder="acme" className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-l-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
                <span className="px-3 py-2 bg-[var(--bg-sunk)] border border-l-0 border-[var(--line-strong)] rounded-r-lg text-sm text-[var(--ink-mute)]">.kunfa.ai</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Custom Domain</label>
              <input type="text" value={form.custom_domain || ''} onChange={(e) => updateField('custom_domain', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Branding</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Logo URL</label>
              <input type="url" value={form.logo_url || ''} onChange={(e) => updateField('logo_url', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Favicon URL</label>
              <input type="url" value={form.favicon_url || ''} onChange={(e) => updateField('favicon_url', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color || '#1c1c28'} onChange={(e) => updateField('primary_color', e.target.value)} className="h-9 w-9 rounded border border-[var(--line-strong)] cursor-pointer" />
                <input type="text" value={form.primary_color || ''} onChange={(e) => updateField('primary_color', e.target.value)} className="flex-1 px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondary_color || '#1F2937'} onChange={(e) => updateField('secondary_color', e.target.value)} className="h-9 w-9 rounded border border-[var(--line-strong)] cursor-pointer" />
                <input type="text" value={form.secondary_color || ''} onChange={(e) => updateField('secondary_color', e.target.value)} className="flex-1 px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent_color || '#10B981'} onChange={(e) => updateField('accent_color', e.target.value)} className="h-9 w-9 rounded border border-[var(--line-strong)] cursor-pointer" />
                <input type="text" value={form.accent_color || ''} onChange={(e) => updateField('accent_color', e.target.value)} className="flex-1 px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Access */}
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Access</h2>
          <div>
            <label className="block text-sm font-medium text-[var(--ink-soft)] mb-2">Signup Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="invitation_only" checked={form.signup_mode === 'invitation_only'} onChange={(e) => updateField('signup_mode', e.target.value)} className="text-[var(--accent-ink)]" />
                <span className="text-sm text-[var(--ink-soft)]">Invitation Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="open" checked={form.signup_mode === 'open'} onChange={(e) => updateField('signup_mode', e.target.value)} className="text-[var(--accent-ink)]" />
                <span className="text-sm text-[var(--ink-soft)]">Open Registration</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Support Email</label>
            <input type="email" value={form.support_email || ''} onChange={(e) => updateField('support_email', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
          </div>
        </div>

        {/* Legal */}
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Legal</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Privacy Policy URL</label>
              <input type="url" value={form.privacy_policy_url || ''} onChange={(e) => updateField('privacy_policy_url', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Terms URL</label>
              <input type="url" value={form.terms_url || ''} onChange={(e) => updateField('terms_url', e.target.value)} className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]" />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Features</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(form.features || {}).map(([key, enabled]) => (
              <label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-sunk)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled as boolean}
                  onChange={() => toggleFeature(key)}
                  className="h-4 w-4 rounded border-[var(--line-strong)] text-[var(--accent-ink)] focus:ring-[var(--ink)]"
                />
                <span className="text-sm text-[var(--ink-soft)]">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Limits */}
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Limits</h2>
          <div className="grid grid-cols-3 gap-4">
            {['max_members', 'max_startups', 'max_deals', 'max_documents', 'max_storage_gb'].map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">
                  {field.replace(/^max_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </label>
                <input
                  type="number"
                  value={form[field] ?? ''}
                  onChange={(e) => updateField(field, e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-[var(--line-strong)] rounded-lg text-sm focus:outline-none focus:shadow-[var(--focus-ring)] focus:border-[var(--line-strong)]"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
