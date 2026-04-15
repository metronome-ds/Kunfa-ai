import { NextRequest, NextResponse } from 'next/server'
import { getTenantById } from '@/lib/tenant-context'

/**
 * GET /api/tenant
 * Returns the tenant config for the current request context.
 * Reads x-tenant-id header injected by middleware.
 * Returns 204 (no content) when not in a tenant context.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')

  if (!tenantId) {
    return new NextResponse(null, { status: 204 })
  }

  const tenant = await getTenantById(tenantId)

  if (!tenant || !tenant.is_active) {
    return new NextResponse(null, { status: 204 })
  }

  // Return a curated subset for the client
  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      display_name: tenant.display_name,
      slug: tenant.slug,
      tagline: tenant.tagline,
      welcome_message: tenant.welcome_message,
      organization_type: tenant.organization_type,

      logo_url: tenant.logo_url,
      logo_dark_url: tenant.logo_dark_url,
      favicon_url: tenant.favicon_url,
      primary_color: tenant.primary_color,
      secondary_color: tenant.secondary_color,
      accent_color: tenant.accent_color,
      font_family: tenant.font_family,
      login_background_url: tenant.login_background_url,
      login_layout: tenant.login_layout,

      features: tenant.features,

      signup_mode: tenant.signup_mode,
      privacy_policy_url: tenant.privacy_policy_url,
      terms_url: tenant.terms_url,
      show_powered_by: tenant.show_powered_by,
      support_email: tenant.support_email,
    },
  })
}
