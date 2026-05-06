/**
 * One-time script to create QA test accounts via Supabase Admin API.
 *
 * Usage:
 *   npx tsx scripts/create-qa-accounts.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars from .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found — needed for SUPABASE_SERVICE_ROLE_KEY');
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = 'QATest2026!';

interface QAAccount {
  email: string;
  fullName: string;
  role: 'startup' | 'investor';
  isAdmin: boolean;
  tier: 'free' | 'pro' | 'fund';
  fundName?: string;
  companyName?: string;
}

const ACCOUNTS: QAAccount[] = [
  {
    email: 'qa-startup@kunfa.ai',
    fullName: 'QA Startup User',
    role: 'startup',
    isAdmin: false,
    tier: 'free',
    companyName: 'QA Startup Co',
  },
  {
    email: 'qa-investor-free@kunfa.ai',
    fullName: 'QA Investor Free',
    role: 'investor',
    isAdmin: false,
    tier: 'free',
    fundName: 'QA Free Fund',
  },
  {
    email: 'qa-investor-pro@kunfa.ai',
    fullName: 'QA Investor Pro',
    role: 'investor',
    isAdmin: false,
    tier: 'pro',
    fundName: 'QA Pro Fund',
  },
  {
    email: 'qa-investor-fund@kunfa.ai',
    fullName: 'QA Investor Fund',
    role: 'investor',
    isAdmin: false,
    tier: 'fund',
    fundName: 'QA Fund Tier Fund',
  },
  {
    email: 'qa-admin@kunfa.ai',
    fullName: 'QA Admin User',
    role: 'startup',
    isAdmin: true,
    tier: 'fund',
    companyName: 'QA Admin Co',
  },
];

async function createAccount(account: QAAccount) {
  console.log(`\n--- Creating ${account.email} ---`);

  // 1. Create auth user via Admin API
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: account.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: account.fullName },
  });

  if (createError) {
    // Handle "user already exists"
    if (createError.message?.includes('already been registered') ||
        createError.message?.includes('already exists')) {
      console.log(`  Auth user already exists, looking up...`);
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users?.find(u => u.email === account.email);
      if (!existing) {
        console.error(`  ERROR: User exists but can't find them. Skipping.`);
        return;
      }
      console.log(`  Found existing user: ${existing.id}`);

      // Update password to ensure it works
      await supabase.auth.admin.updateUserById(existing.id, {
        password: PASSWORD,
        email_confirm: true,
      });
      console.log(`  Password updated.`);

      await ensureProfile(existing.id, account);
      return;
    }

    console.error(`  ERROR creating auth user:`, createError.message);
    return;
  }

  const userId = userData.user.id;
  console.log(`  Auth user created: ${userId}`);

  await ensureProfile(userId, account);
}

async function ensureProfile(userId: string, account: QAAccount) {
  // 2. Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingProfile) {
    console.log(`  Profile already exists: ${existingProfile.id}`);

    // Update fields to match spec
    await supabase
      .from('profiles')
      .update({
        full_name: account.fullName,
        email: account.email,
        role: account.role,
        is_admin: account.isAdmin,
        onboarding_completed: true,
        fund_name: account.fundName || null,
        company_name: account.companyName || null,
      })
      .eq('id', existingProfile.id);
    console.log(`  Profile updated.`);

    await ensureSubscription(existingProfile.id, account);
    return;
  }

  // 3. Insert profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      email: account.email,
      full_name: account.fullName,
      role: account.role,
      is_admin: account.isAdmin,
      onboarding_completed: true,
      fund_name: account.fundName || null,
      company_name: account.companyName || null,
    })
    .select('id')
    .single();

  if (profileError) {
    console.error(`  ERROR creating profile:`, profileError.message);
    return;
  }

  console.log(`  Profile created: ${profile.id}`);
  await ensureSubscription(profile.id, account);
}

async function ensureSubscription(profileId: string, account: QAAccount) {
  if (account.tier === 'free') {
    console.log(`  Tier: free (no subscription needed)`);
    return;
  }

  // Check if subscription already exists
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, tier')
    .eq('user_id', profileId)
    .eq('status', 'active')
    .maybeSingle();

  if (existingSub) {
    if (existingSub.tier === account.tier) {
      console.log(`  Subscription already exists: ${account.tier}`);
      return;
    }
    // Update tier
    await supabase
      .from('subscriptions')
      .update({ tier: account.tier })
      .eq('id', existingSub.id);
    console.log(`  Subscription updated to: ${account.tier}`);
    return;
  }

  // Create subscription
  const { error: subError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: profileId,
      tier: account.tier,
      source: 'admin_grant',
      status: 'active',
      grant_reason: 'QA test account',
    });

  if (subError) {
    console.error(`  ERROR creating subscription:`, subError.message);
    return;
  }

  console.log(`  Subscription created: ${account.tier}`);
}

async function main() {
  console.log('Creating QA test accounts...');
  console.log(`Supabase URL: ${supabaseUrl}`);

  for (const account of ACCOUNTS) {
    await createAccount(account);
  }

  console.log('\n=== Done! ===');
  console.log('Verify with:');
  console.log(`  npx playwright test tests/e2e/01-landing-page.spec.ts`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
