import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Lightweight tenant resolution for middleware (Edge Runtime compatible)
// ---------------------------------------------------------------------------

interface TenantHeader {
  id: string;
  slug: string;
  name: string;
}

// Simple in-memory cache (per-instance, resets on cold start)
const tenantCache = new Map<string, { data: TenantHeader | null; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function lookupTenant(key: string, column: string, value: string): Promise<TenantHeader | null> {
  const cacheKey = `${key}:${value}`;
  const cached = tenantCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  try {
    const db = getServiceClient();
    const { data } = await db
      .from("tenants")
      .select("id, slug, name")
      .eq(column, value)
      .eq("is_active", true)
      .maybeSingle();

    const result = data ? { id: data.id, slug: data.slug, name: data.name } : null;
    tenantCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
    return result;
  } catch {
    return null;
  }
}

async function resolveTenant(request: NextRequest): Promise<TenantHeader | null> {
  // 1. Dev mode: ?tenant=slug override
  const tenantParam = request.nextUrl.searchParams.get("tenant");
  if (tenantParam) {
    return lookupTenant("slug", "slug", tenantParam);
  }

  const host = request.headers.get("host")?.split(":")[0] || "";

  // 2. Skip main platform domains
  if (host === "kunfa.ai" || host === "www.kunfa.ai") return null;
  if (host === "localhost" || host === "127.0.0.1") return null;

  // 3. Subdomain of kunfa.ai (e.g., acme.kunfa.ai)
  if (host.endsWith(".kunfa.ai")) {
    const subdomain = host.replace(".kunfa.ai", "");
    if (subdomain && subdomain !== "www") {
      return lookupTenant("subdomain", "subdomain", subdomain);
    }
    return null;
  }

  // 4. Vercel preview deploys — no tenant
  if (host.endsWith(".vercel.app")) return null;

  // 5. Custom domain
  return lookupTenant("domain", "custom_domain", host);
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for Stripe webhooks — they carry no cookies/session
  // and must not be intercepted by auth logic
  if (pathname.startsWith("/api/stripe/")) {
    return NextResponse.next();
  }

  // Skip middleware for auth routes that handle tokens
  if (pathname.startsWith("/auth/callback") || pathname.startsWith("/auth/confirm")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Record<string, unknown>
            )
          );
        },
      },
    }
  );

  // Refresh session — this also reads the auth token cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return supabaseResponse;
  }

  // ---------------------------------------------------------------------------
  // Tenant resolution — inject headers for downstream consumption
  //
  // Headers must be set on the REQUEST (not the response) so that downstream
  // API routes can read them via `request.headers`. We rebuild the response
  // with the mutated request headers, and also mirror them onto the response
  // for client-side visibility if needed.
  // ---------------------------------------------------------------------------
  const tenant = await resolveTenant(request);
  if (tenant) {
    request.headers.set("x-tenant-id", tenant.id);
    request.headers.set("x-tenant-slug", tenant.slug);
    request.headers.set("x-tenant-name", tenant.name);

    // Rebuild the response so the mutated request headers are forwarded.
    const newHeaders = new Headers(request.headers);
    const rebuilt = NextResponse.next({ request: { headers: newHeaders } });
    // Preserve cookies that Supabase may have set on the original response.
    supabaseResponse.cookies.getAll().forEach((c) => {
      rebuilt.cookies.set(c.name, c.value);
    });
    rebuilt.headers.set("x-tenant-id", tenant.id);
    rebuilt.headers.set("x-tenant-slug", tenant.slug);
    rebuilt.headers.set("x-tenant-name", tenant.name);
    supabaseResponse = rebuilt;
  }

  // Protected routes
  if (
    !user &&
    (pathname.startsWith("/onboarding") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/deals") ||
      pathname.startsWith("/pipeline") ||
      pathname.startsWith("/saved-deals") ||
      pathname.startsWith("/portfolio") ||
      pathname.startsWith("/team") ||
      pathname.startsWith("/services") ||
      pathname.startsWith("/people") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/calculators") ||
      pathname.startsWith("/company-profile") ||
      pathname.startsWith("/data-room") ||
      pathname.startsWith("/investors") ||
      pathname.startsWith("/investors-directory") ||
      pathname.startsWith("/startups") ||
      pathname.startsWith("/debt-partners") ||
      pathname.startsWith("/points") ||
      pathname.startsWith("/rewards") ||
      pathname.startsWith("/admin"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login/signup
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
