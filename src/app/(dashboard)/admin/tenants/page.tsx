'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/supabase'
import { isSuperAdmin } from '@/lib/super-admins'
import { Plus, Building2, ExternalLink } from 'lucide-react'

interface TenantRow {
  id: string
  name: string
  display_name: string | null
  slug: string
  subdomain: string | null
  custom_domain: string | null
  is_active: boolean
  primary_color: string | null
  logo_url: string | null
  signup_mode: string | null
  created_at: string
}

export default function AdminTenantsPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser()
      if (!user || !isSuperAdmin(user.email)) {
        router.push('/dashboard')
        return
      }

      const res = await fetch('/api/admin/tenants')
      if (res.ok) {
        const data = await res.json()
        setTenants(data.tenants || [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--serif)] tabular-nums tracking-tight text-[var(--ink)]">Tenant Management</h1>
          <p className="text-[var(--ink-mute)] text-sm mt-1">Manage white-label tenant configurations</p>
        </div>
        <Link
          href="/admin/tenants/create"
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--ink)] text-white rounded-lg font-medium text-sm hover:bg-[var(--ink-2)] transition"
        >
          <Plus className="h-4 w-4" />
          Create Tenant
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--line-strong)]" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] p-12 text-center">
          <Building2 className="h-12 w-12 text-[var(--ink-faint)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--ink)] mb-2">No tenants yet</h3>
          <p className="text-[var(--ink-mute)] text-sm mb-6">Create your first white-label tenant to get started.</p>
          <Link
            href="/admin/tenants/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--ink)] text-white rounded-lg font-medium text-sm hover:bg-[var(--ink-2)] transition"
          >
            <Plus className="h-4 w-4" />
            Create Tenant
          </Link>
        </div>
      ) : (
        <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg-sunk)]/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--ink-mute)] uppercase tracking-wider">Tenant</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--ink-mute)] uppercase tracking-wider">Domain</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--ink-mute)] uppercase tracking-wider">Access</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--ink-mute)] uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--ink-mute)] uppercase tracking-wider">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--bg-sunk)]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {t.logo_url ? (
                        <img src={t.logo_url} alt="" className="h-8 w-8 rounded object-contain bg-[var(--bg-sunk)]" />
                      ) : (
                        <div
                          className="h-8 w-8 rounded flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: t.primary_color || '#1c1c28' }}
                        >
                          {t.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-[var(--ink)]">{t.display_name || t.name}</p>
                        <p className="text-xs text-[var(--ink-mute)]">{t.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-[var(--ink-soft)]">
                      {t.custom_domain || (t.subdomain ? `${t.subdomain}.kunfa.ai` : '—')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      t.signup_mode === 'invitation_only'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-green-50 text-green-700'
                    }`}>
                      {t.signup_mode === 'invitation_only' ? 'Invite Only' : 'Open'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      t.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-[var(--ink-mute)]">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="text-sm text-[var(--accent-ink)] hover:text-[var(--ink)] font-medium"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
