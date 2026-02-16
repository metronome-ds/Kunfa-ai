import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for auth callback — let the client page handle tokens
  if (pathname.startsWith("/auth/callback")) {
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
      pathname === "/" ||
      pathname.startsWith("/deals") ||
      pathname.startsWith("/pipeline") ||
      pathname.startsWith("/saved-deals") ||
      pathname.startsWith("/portfolio") ||
      pathname.startsWith("/team") ||
      pathname.startsWith("/services") ||
      pathname.startsWith("/people") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/calculators"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
