'use client'

import { useState, useEffect } from 'react'
import type { TenantBranding } from '@/components/TenantProvider'

/**
 * Lightweight hook for pages outside DashboardShell (login, signup)
 * to fetch and apply tenant branding.
 */
export function useTenantBranding() {
  const [tenant, setTenant] = useState<TenantBranding | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/tenant')
        if (res.ok && res.status !== 204) {
          const data = await res.json()
          if (!cancelled && data.tenant) {
            setTenant(data.tenant)
            applyBranding(data.tenant)
          }
        }
      } catch {
        // No tenant — main platform
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { tenant, loading, isTenantContext: !!tenant }
}

function applyBranding(tenant: TenantBranding) {
  const root = document.documentElement

  if (tenant.primary_color && tenant.primary_color !== '#007CF8') {
    root.style.setProperty('--primary', tenant.primary_color)
    root.style.setProperty('--border-focus', tenant.primary_color)
  }

  if (tenant.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = tenant.favicon_url
  }

  const displayName = tenant.display_name || tenant.name
  if (displayName) {
    document.title = `${displayName} — Sign In`
  }
}
