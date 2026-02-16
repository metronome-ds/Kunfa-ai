/**
 * Server-side Supabase client initialization
 * Uses @supabase/ssr for server components and API routes
 * Handles cookies for session management
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for server-side usage
 * This client is used in API routes and server components
 * It properly handles cookies for session persistence
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Handle cookie setting errors in server context
          }
        },
      },
    },
  );
}

/**
 * Helper function to get the current user from server context
 */
export async function getServerUser() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting server user:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Unexpected error getting server user:', error);
    return null;
  }
}

/**
 * Helper function to get session from server context
 */
export async function getServerSession() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting server session:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Unexpected error getting server session:', error);
    return null;
  }
}
