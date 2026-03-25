import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
