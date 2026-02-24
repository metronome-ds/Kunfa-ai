// LinkedIn OAuth has been replaced with Supabase Magic Link auth.
// This route is no longer used. See /auth/callback for the magic link handler.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
