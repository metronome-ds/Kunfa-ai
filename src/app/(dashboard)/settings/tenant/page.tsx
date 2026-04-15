'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/components/TenantProvider'
import { Save, CheckCircle, Palette, Mail, Shield, FileText } from 'lucide-react'

type Tab = 'branding' | 'email' | 'access' | 'legal'

const INPUT_CLASS = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all'

export default function TenantSettingsPage() {
  const { isTenantContext } = useTenant()
  const [activeTab, setActiveTab] = useState<Tab>('branding')
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/tenant/settings')
        if (res.ok) {
          const data = await res.json()
          setForm(data.tenant || {})
        }
      } catch {
        // Not a tenant admin
      }
      setLoading(false)
    }
    load()
  }, [])

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    const res = await fetch('/api/tenant/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save')
    }
    setSaving(false)
  }

  if (!isTenantContext) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Tenant settings are only available in a tenant context.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" />
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'branding', label: 'Branding', icon: <Palette className="h-4 w-4" /> },
    { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
    { id: 'access', label: 'Access', icon: <Shield className="h-4 w-4" /> },
    { id: 'legal', label: 'Legal', icon: <FileText className="h-4 w-4" /> },
  ]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your organization&apos;s configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#007CF8] text-white rounded-lg font-medium text-sm hover:bg-[#0066D6] transition disabled:opacity-50"
        >
          {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Identity</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input type="text" value={form.display_name || ''} onChange={(e) => updateField('display_name', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                <input type="text" value={form.tagline || ''} onChange={(e) => updateField('tagline', e.target.value)} className={INPUT_CLASS} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
              <textarea value={form.welcome_message || ''} onChange={(e) => updateField('welcome_message', e.target.value)} rows={2} className={INPUT_CLASS} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Visual</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input type="url" value={form.logo_url || ''} onChange={(e) => updateField('logo_url', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
                <input type="url" value={form.favicon_url || ''} onChange={(e) => updateField('favicon_url', e.target.value)} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primary_color || '#007CF8'} onChange={(e) => updateField('primary_color', e.target.value)} className="h-9 w-9 rounded border border-gray-300 cursor-pointer" />
                  <input type="text" value={form.primary_color || ''} onChange={(e) => updateField('primary_color', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondary_color || '#1F2937'} onChange={(e) => updateField('secondary_color', e.target.value)} className="h-9 w-9 rounded border border-gray-300 cursor-pointer" />
                  <input type="text" value={form.secondary_color || ''} onChange={(e) => updateField('secondary_color', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.accent_color || '#10B981'} onChange={(e) => updateField('accent_color', e.target.value)} className="h-9 w-9 rounded border border-gray-300 cursor-pointer" />
                  <input type="text" value={form.accent_color || ''} onChange={(e) => updateField('accent_color', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.show_powered_by !== false} onChange={(e) => updateField('show_powered_by', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#007CF8]" />
              <span className="text-sm text-gray-700">Show &quot;Powered by Kunfa&quot; badge</span>
            </label>
          </div>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Email Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
              <input type="text" value={form.email_from_name || ''} onChange={(e) => updateField('email_from_name', e.target.value)} placeholder="Your Organization" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input type="email" value={form.support_email || ''} onChange={(e) => updateField('support_email', e.target.value)} placeholder="support@yourorg.com" className={INPUT_CLASS} />
            </div>
          </div>
        </div>
      )}

      {/* Access Tab */}
      {activeTab === 'access' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Access Control</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Signup Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="invitation_only" checked={form.signup_mode === 'invitation_only'} onChange={(e) => updateField('signup_mode', e.target.value)} className="text-[#007CF8]" />
                <span className="text-sm text-gray-700">Invitation Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="open" checked={form.signup_mode === 'open'} onChange={(e) => updateField('signup_mode', e.target.value)} className="text-[#007CF8]" />
                <span className="text-sm text-gray-700">Open Registration</span>
              </label>
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.require_accreditation === true} onChange={(e) => updateField('require_accreditation', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#007CF8]" />
              <span className="text-sm text-gray-700">Require accreditation verification</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.require_nda === true} onChange={(e) => updateField('require_nda', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#007CF8]" />
              <span className="text-sm text-gray-700">Require NDA before access</span>
            </label>
          </div>
          {form.require_nda && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NDA Document URL</label>
              <input type="url" value={form.nda_document_url || ''} onChange={(e) => updateField('nda_document_url', e.target.value)} className={INPUT_CLASS} />
            </div>
          )}
        </div>
      )}

      {/* Legal Tab */}
      {activeTab === 'legal' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Legal</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy URL</label>
              <input type="url" value={form.privacy_policy_url || ''} onChange={(e) => updateField('privacy_policy_url', e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms of Service URL</label>
              <input type="url" value={form.terms_url || ''} onChange={(e) => updateField('terms_url', e.target.value)} className={INPUT_CLASS} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description || ''} onChange={(e) => updateField('description', e.target.value)} rows={3} className={INPUT_CLASS} placeholder="Brief description of your organization..." />
          </div>
        </div>
      )}
    </div>
  )
}
