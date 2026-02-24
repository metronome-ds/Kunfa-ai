// LinkedIn OAuth callback has been replaced with Supabase Magic Link auth.
// The magic link callback is now handled at /auth/callback (not /api/auth/callback).

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
