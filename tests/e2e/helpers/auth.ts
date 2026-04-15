import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://akvjxobgnbbljmtvrlhk.supabase.co';
const STORAGE_KEY = 'sb-akvjxobgnbbljmtvrlhk-auth-token';

function getAnonKey(): string {
  // Try env var first
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  // Fall back to .env.local
  const envPath = path.resolve(__dirname, '../../../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    if (match) return match[1].trim();
  }

  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY not found in env or .env.local');
}

/**
 * Log in via Supabase Auth REST API and inject the session into the page.
 * Much faster and more reliable than filling the login form.
 */
export async function loginAs(page: Page, email: string, password: string) {
  const anonKey = getAnonKey();

  // Call Supabase auth token endpoint
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase login failed for ${email}: ${response.status} ${body}`);
  }

  const data = await response.json();
  const { access_token, refresh_token, expires_in, token_type, user } = data;

  // Navigate to base URL first (needed to set localStorage on the correct origin)
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Inject auth session into localStorage
  await page.evaluate(
    ({ key, token }) => {
      localStorage.setItem(key, JSON.stringify(token));
    },
    {
      key: STORAGE_KEY,
      token: {
        access_token,
        refresh_token,
        expires_in,
        expires_at: Math.floor(Date.now() / 1000) + expires_in,
        token_type,
        user,
      },
    },
  );

  // Reload so the app picks up the session
  await page.reload();
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
