// Email/password auth has been replaced with Supabase Magic Link auth.
// This route is no longer used. See /auth/callback for the magic link handler.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Email/password auth has been replaced with magic link auth. Use the login page to sign in." },
    { status: 410 }
  );
}
