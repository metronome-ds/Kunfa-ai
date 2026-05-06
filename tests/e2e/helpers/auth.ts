import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://akvjxobgnbbljmtvrlhk.supabase.co';

function getAnonKey(): string {
  // Try env var first
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  // Fall back to .env.local / .env files in the repo root
  const roots = [process.cwd(), path.resolve(__dirname, '../../..')];
  const envFiles = ['.env.local', '.env'];

  for (const root of roots) {
    for (const file of envFiles) {
      try {
        const envPath = path.join(root, file);
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf-8');
          const match = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
          if (match) return match[1].trim();
        }
      } catch {
        // Silently continue to next fallback
      }
    }
  }

  throw new Error(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY not found. Set it as an environment variable or in .env.local',
  );
}

// ---------------------------------------------------------------------------
// Session cache — pre-fetch tokens once per account, reuse across tests
// ---------------------------------------------------------------------------

interface CachedToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

const tokenCache = new Map<string, CachedToken>();

async function fetchToken(email: string, password: string): Promise<CachedToken> {
  const cached = tokenCache.get(email);
  if (cached && cached.expires_at > Math.floor(Date.now() / 1000) + 60) {
    return cached;
  }

  const anonKey = getAnonKey();
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      const token: CachedToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      };
      tokenCache.set(email, token);
      return token;
    }

    // Retry on 429 (rate limit) with exponential backoff
    if (response.status === 429) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[auth] Rate limited for ${email}, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    const body = await response.text();
    throw new Error(`Supabase login failed for ${email}: ${response.status} ${body}`);
  }

  throw new Error(`Supabase login failed for ${email}: exceeded ${maxRetries} retries (rate limited)`);
}

/**
 * Log in via Supabase Auth REST API and inject the session into the page
 * using the Supabase browser client's setSession method.
 *
 * This is the correct approach for @supabase/ssr cookie-based auth:
 * the browser client's setSession call sets the right cookies that
 * the middleware can read.
 */
export async function loginAs(page: Page, email: string, password: string) {
  const token = await fetchToken(email, password);

  // Navigate to the app first so we're on the right origin
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Use the Supabase browser client that's already loaded on the page
  // to call setSession — this sets cookies correctly via @supabase/ssr
  const success = await page.evaluate(
    async ({ accessToken, refreshToken, supabaseUrl, anonKey }) => {
      // Access the Supabase client from the app, or create one inline
      // @supabase/ssr createBrowserClient is already on the page via the app bundle
      // But we can also use the REST API to set the session cookie directly
      try {
        // Try using the app's Supabase client (it's a global singleton)
        const { createBrowserClient } = await import(
          /* @vite-ignore */
          'https://esm.sh/@supabase/ssr@0.8.0'
        );
        const supabase = createBrowserClient(supabaseUrl, anonKey);
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return !error;
      } catch {
        return false;
      }
    },
    {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      supabaseUrl: SUPABASE_URL,
      anonKey: getAnonKey(),
    },
  );

  if (!success) {
    // Fallback: sign in directly in the browser using fetch to set cookies
    await page.evaluate(
      async ({ email: e, password: p, supabaseUrl, anonKey }) => {
        const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
          },
          body: JSON.stringify({ email: e, password: p }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Login failed in browser');
        const data = await res.json();

        // Set cookies that @supabase/ssr reads
        // The cookie names follow the pattern: sb-<project-ref>-auth-token
        const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
        const cookieBase = `sb-${projectRef}-auth-token`;
        const sessionStr = JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
          token_type: data.token_type,
          user: data.user,
        });

        // Supabase SSR splits large cookies into chunks
        const chunkSize = 3500;
        if (sessionStr.length <= chunkSize) {
          document.cookie = `${cookieBase}=${encodeURIComponent(sessionStr)}; path=/; max-age=${data.expires_in}; samesite=lax`;
        } else {
          const chunks = [];
          for (let i = 0; i < sessionStr.length; i += chunkSize) {
            chunks.push(sessionStr.slice(i, i + chunkSize));
          }
          for (let i = 0; i < chunks.length; i++) {
            document.cookie = `${cookieBase}.${i}=${encodeURIComponent(chunks[i])}; path=/; max-age=${data.expires_in}; samesite=lax`;
          }
        }
      },
      {
        email,
        password,
        supabaseUrl: SUPABASE_URL,
        anonKey: getAnonKey(),
      },
    );
  }

  // Navigate to dashboard — middleware should now see the auth cookies
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

/** Test account passwords — all use the same password */
export const TEST_PASSWORD = 'QATest2026!';

/** Pre-configured test accounts */
export const TEST_ACCOUNTS = {
  startup: 'qa-startup@kunfa.ai',
  investorFree: 'qa-investor-free@kunfa.ai',
  investorPro: 'qa-investor-pro@kunfa.ai',
  investorFund: 'qa-investor-fund@kunfa.ai',
  admin: 'qa-admin@kunfa.ai',
} as const;
