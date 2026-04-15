'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/supabase'
import { isSuperAdmin } from '@/lib/super-admins'
import { ArrowLeft } from 'lucide-react'

const DEFAULT_FEATURES: Record<string, boolean> = {
  deals_browse: true,
  pipeline: true,
  saved_deals: true,
  communities: true,
  ai_scoring: true,
  data_room: true,
  term_sheet_analyzer: true,
  cap_table: false,
  valuation_calculator: false,
  services: true,
  investors: true,
  debt_partners: true,
  rewards: false,
  points: false,
}

export default function CreateTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#007CF8')
  const [secondaryColor, setSecondaryColor] = useState('#1F2937')
  const [accentColor, setAccentColor] = useState('#10B981')
  const [logoUrl, setLogoUrl] = useState('')
  const [tagline, setTagline] = useState('')
  const [signupMode, setSignupMode] = useState('invitation_only')
  const [features, setFeatures] = useState<Record<string, boolean>>(DEFAULT_FEATURES)

  useEffect(() => {
    async function checkAccess() {
      const user = await getCurrentUser()
      if (!user || !isSuperAdmin(user.email)) {
        router.push('/dashboard')
      }
    }
    checkAccess()
  }, [router])

  // Auto-generate slug from name
  useEffect(() => {
    if (name && !slug) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }, [name, slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug,
        subdomain: subdomain || null,
        custom_domain: customDomain || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        logo_url: logoUrl || null,
        tagline: tagline || null,
        signup_mode: signupMode,
        features,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/admin/tenants/${data.tenant.id}`)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create tenant')
      setLoading(false)
    }
  }

  const toggleFeature = (key: string) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Tenants
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Tenant</h1>
      <p className="text-gray-500 text-sm mb-8">Set up a new white-label tenant configuration.</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (!slug) setSlug('') }}
                required
                placeholder="Acme Capital"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                placeholder="acme-capital"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Your investment platform"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
            />
          </div>
        </div>

        {/* Domain */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Domain</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="acme"
                  className="w-full px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                />
                <span className="px-3 py-2 bg-gray-50 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">.kunfa.ai</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                placeholder="deals.acme.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-9 rounded border border-gray-300 cursor-pointer" />
                <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-9 w-9 rounded border border-gray-300 cursor-pointer" />
                <input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-9 rounded border border-gray-300 cursor-pointer" />
                <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Access */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Access</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Signup Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="invitation_only" checked={signupMode === 'invitation_only'} onChange={(e) => setSignupMode(e.target.value)} className="text-[#007CF8]" />
                <span className="text-sm text-gray-700">Invitation Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="open" checked={signupMode === 'open'} onChange={(e) => setSignupMode(e.target.value)} className="text-[#007CF8]" />
                <span className="text-sm text-gray-700">Open Registration</span>
              </label>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Features</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(features).map(([key, enabled]) => (
              <label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleFeature(key)}
                  className="h-4 w-4 rounded border-gray-300 text-[#007CF8] focus:ring-[#007CF8]"
                />
                <span className="text-sm text-gray-700">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-4">
          <Link href="/admin/tenants" className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !name || !slug}
            className="px-6 py-2.5 bg-[#007CF8] text-white rounded-lg font-medium text-sm hover:bg-[#0066D6] transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </div>
  )
}
