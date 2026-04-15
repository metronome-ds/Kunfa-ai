/**
 * Tenant Context — resolution and lookup for multi-tenant white-label support.
 *
 * Uses the service role client for all queries (bypasses RLS).
 * Implements a 5-minute in-memory cache to avoid repeated DB lookups.
 */

import { getSupabase } from './db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TenantConfig {
  id: string
  entity_id: string | null
  name: string
  display_name: string | null
  slug: string
  tagline: string | null
  welcome_message: string | null
  description: string | null
  organization_type: string | null

  // Branding
  logo_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  font_family: string
  login_background_url: string | null
  login_layout: string | null

  // Domain
  subdomain: string | null
  custom_domain: string | null

  // Email
  email_from_name: string | null
  email_from_address: string | null
  support_email: string | null

  // Features
  features: Record<string, boolean>

  // Access
  signup_mode: string // 'open' | 'invitation_only'
  default_member_role: string | null
  require_accreditation: boolean
  require_nda: boolean
  nda_document_url: string | null

  // Legal
  privacy_policy_url: string | null
  terms_url: string | null
  show_powered_by: boolean

  // Status
  is_active: boolean
}

// Minimal tenant info injected via middleware headers
export interface TenantHeader {
  id: string
  slug: string
  name: string
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  tenant: TenantConfig
  expiresAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const tenantCache = new Map<string, CacheEntry>()

function getCached(key: string): TenantConfig | null {
  const entry = tenantCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    tenantCache.delete(key)
    return null
  }
  return entry.tenant
}

function setCache(key: string, tenant: TenantConfig) {
  tenantCache.set(key, { tenant, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ---------------------------------------------------------------------------
// Row → TenantConfig mapper
// ---------------------------------------------------------------------------

function rowToTenantConfig(row: Record<string, unknown>): TenantConfig {
  return {
    id: row.id as string,
    entity_id: (row.entity_id as string) || null,
    name: row.name as string,
    display_name: (row.display_name as string) || null,
    slug: row.slug as string,
    tagline: (row.tagline as string) || null,
    welcome_message: (row.welcome_message as string) || null,
    description: (row.description as string) || null,
    organization_type: (row.organization_type as string) || null,

    logo_url: (row.logo_url as string) || null,
    logo_dark_url: (row.logo_dark_url as string) || null,
    favicon_url: (row.favicon_url as string) || null,
    primary_color: (row.primary_color as string) || '#007CF8',
    secondary_color: (row.secondary_color as string) || '#1F2937',
    accent_color: (row.accent_color as string) || '#10B981',
    font_family: (row.font_family as string) || 'Inter',
    login_background_url: (row.login_background_url as string) || null,
    login_layout: (row.login_layout as string) || null,

    subdomain: (row.subdomain as string) || null,
    custom_domain: (row.custom_domain as string) || null,

    email_from_name: (row.email_from_name as string) || null,
    email_from_address: (row.email_from_address as string) || null,
    support_email: (row.support_email as string) || null,

    features: (row.features as Record<string, boolean>) || {},

    signup_mode: (row.signup_mode as string) || 'invitation_only',
    default_member_role: (row.default_member_role as string) || null,
    require_accreditation: (row.require_accreditation as boolean) || false,
    require_nda: (row.require_nda as boolean) || false,
    nda_document_url: (row.nda_document_url as string) || null,

    privacy_policy_url: (row.privacy_policy_url as string) || null,
    terms_url: (row.terms_url as string) || null,
    show_powered_by: row.show_powered_by !== false,

    is_active: row.is_active !== false,
  }
}

// ---------------------------------------------------------------------------
// Lookup functions
// ---------------------------------------------------------------------------

const TENANT_SELECT = `
  id, entity_id, name, display_name, slug, tagline, welcome_message, description, organization_type,
  logo_url, logo_dark_url, favicon_url, primary_color, secondary_color, accent_color, font_family,
  login_background_url, login_layout,
  subdomain, custom_domain,
  email_from_name, email_from_address, support_email,
  features,
  signup_mode, default_member_role, require_accreditation, require_nda, nda_document_url,
  privacy_policy_url, terms_url, show_powered_by,
  is_active
`

/**
 * Resolve tenant by custom domain.
 */
export async function resolveTenantByDomain(domain: string): Promise<TenantConfig | null> {
  const cacheKey = `domain:${domain}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const db = getSupabase()
  const { data } = await db
    .from('tenants')
    .select(TENANT_SELECT)
    .eq('custom_domain', domain)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null

  const tenant = rowToTenantConfig(data)
  setCache(cacheKey, tenant)
  setCache(`slug:${tenant.slug}`, tenant)
  setCache(`id:${tenant.id}`, tenant)
  return tenant
}

/**
 * Resolve tenant by subdomain (e.g., "acme" from "acme.kunfa.ai").
 */
export async function resolveTenantBySubdomain(subdomain: string): Promise<TenantConfig | null> {
  const cacheKey = `subdomain:${subdomain}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const db = getSupabase()
  const { data } = await db
    .from('tenants')
    .select(TENANT_SELECT)
    .eq('subdomain', subdomain)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null

  const tenant = rowToTenantConfig(data)
  setCache(cacheKey, tenant)
  setCache(`slug:${tenant.slug}`, tenant)
  setCache(`id:${tenant.id}`, tenant)
  return tenant
}

/**
 * Resolve tenant by slug (used for ?tenant=slug dev mode).
 */
export async function resolveTenantBySlug(slug: string): Promise<TenantConfig | null> {
  const cacheKey = `slug:${slug}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const db = getSupabase()
  const { data } = await db
    .from('tenants')
    .select(TENANT_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null

  const tenant = rowToTenantConfig(data)
  setCache(cacheKey, tenant)
  setCache(`id:${tenant.id}`, tenant)
  return tenant
}

/**
 * Get tenant by ID.
 */
export async function getTenantById(id: string): Promise<TenantConfig | null> {
  const cacheKey = `id:${id}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const db = getSupabase()
  const { data } = await db
    .from('tenants')
    .select(TENANT_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (!data) return null

  const tenant = rowToTenantConfig(data)
  setCache(cacheKey, tenant)
  setCache(`slug:${tenant.slug}`, tenant)
  return tenant
}

// ---------------------------------------------------------------------------
// Hostname resolution (used by middleware)
// ---------------------------------------------------------------------------

/**
 * Resolve tenant from a hostname.
 * Priority: custom domain → subdomain (*.kunfa.ai) → null (main platform).
 */
export async function resolveTenantByHostname(hostname: string): Promise<TenantConfig | null> {
  // Strip port if present
  const host = hostname.split(':')[0]

  // Skip main platform domains
  if (host === 'kunfa.ai' || host === 'www.kunfa.ai') return null
  if (host === 'localhost' || host === '127.0.0.1') return null

  // Check if it's a subdomain of kunfa.ai
  if (host.endsWith('.kunfa.ai')) {
    const subdomain = host.replace('.kunfa.ai', '')
    if (subdomain && subdomain !== 'www') {
      return resolveTenantBySubdomain(subdomain)
    }
    return null
  }

  // Check if it's a Vercel preview deploy
  if (host.endsWith('.vercel.app')) return null

  // Otherwise treat as custom domain
  return resolveTenantByDomain(host)
}

// ---------------------------------------------------------------------------
// Header helpers (for reading tenant from middleware-injected headers)
// ---------------------------------------------------------------------------

/**
 * Parse tenant info from request headers (set by middleware).
 * Returns null if no tenant headers present.
 */
export function getTenantFromHeaders(headers: Headers): TenantHeader | null {
  const id = headers.get('x-tenant-id')
  const slug = headers.get('x-tenant-slug')
  const name = headers.get('x-tenant-name')

  if (!id || !slug) return null

  return { id, slug, name: name || slug }
}
