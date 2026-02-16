# Kunfa AI - Authentication Setup Checklist

Complete this checklist to get your authentication system up and running.

## Phase 1: Supabase Setup

- [ ] Create Supabase account at https://supabase.com
- [ ] Create new project
- [ ] Wait for project to be initialized
- [ ] Go to Project Settings → API
  - [ ] Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] Copy Anon Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Go to SQL Editor
  - [ ] Create new query
  - [ ] Copy entire contents of `database.sql`
  - [ ] Paste into editor
  - [ ] Click "Run"
  - [ ] Verify users table is created
- [ ] Go to Authentication → Providers
  - [ ] Enable Email provider
  - [ ] Configure SMTP if needed (optional for development)

## Phase 2: LinkedIn OAuth Setup

- [ ] Go to https://www.linkedin.com/developers/apps
- [ ] Create new application
- [ ] Fill in application details:
  - [ ] App name: "Kunfa AI" (or your name)
  - [ ] App logo: Upload Kunfa logo
  - [ ] Application URL: Your company website (or localhost)
  - [ ] Legal agreement: Accept
- [ ] Go to "Auth" tab
  - [ ] Copy Client ID → `NEXT_PUBLIC_LINKEDIN_CLIENT_ID`
  - [ ] Copy Client Secret → `LINKEDIN_CLIENT_SECRET`
- [ ] Go to "Settings" tab
  - [ ] Add Authorized redirect URLs:
    - [ ] `http://localhost:3000/api/auth/callback` (development)
    - [ ] `https://yourdomain.com/api/auth/callback` (production - add later)
  - [ ] Verify section → Request access to Sign In with LinkedIn
    - [ ] Select "Sign In with LinkedIn"
    - [ ] Wait for approval (usually instant)

## Phase 3: Environment Configuration

- [ ] Copy `.env.example` to `.env.local`:
  ```bash
  cp .env.example .env.local
  ```
- [ ] Open `.env.local` and fill in:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` (from Supabase)
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase)
  - [ ] `NEXT_PUBLIC_LINKEDIN_CLIENT_ID` (from LinkedIn)
  - [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000` (development)
  - [ ] `LINKEDIN_CLIENT_SECRET` (from LinkedIn)
  - [ ] `NODE_ENV=development`
- [ ] Save `.env.local`
- [ ] **IMPORTANT:** Never commit `.env.local` to git
- [ ] Verify `.env.local` is in `.gitignore`

## Phase 4: Project Setup

- [ ] Install dependencies:
  ```bash
  npm install
  ```
- [ ] Verify all dependencies installed:
  ```bash
  npm ls
  ```
- [ ] Check for build errors:
  ```bash
  npm run build
  ```

## Phase 5: Development Testing

### Test Authentication Flow

- [ ] Start development server:
  ```bash
  npm run dev
  ```
- [ ] Open http://localhost:3000 in browser
- [ ] Should redirect to `/login`
- [ ] Login page should load with:
  - [ ] "Kunfa AI" title visible
  - [ ] "Source. Analyze. Invest." tagline
  - [ ] LinkedIn button with correct styling
  - [ ] Email/password form below divider

### Test LinkedIn OAuth

- [ ] Click "Continue with LinkedIn" button
- [ ] Should redirect to LinkedIn.com authorization page
- [ ] Should see your app requesting permissions
- [ ] Click "Allow" to authorize
- [ ] Should redirect back to `http://localhost:3000/api/auth/callback`
- [ ] Should redirect to onboarding page
- [ ] Check that user was created in Supabase
  - [ ] Go to Supabase Dashboard → Authentication → Users
  - [ ] Verify your user appears with email
  - [ ] Go to Database → users table
  - [ ] Verify user profile row was created with:
    - [ ] `linkedin_id` populated
    - [ ] `name` filled from LinkedIn
    - [ ] `email` filled from LinkedIn
    - [ ] `avatar_url` populated

### Test Onboarding Flow

- [ ] Step 1 - Profile:
  - [ ] Name pre-filled
  - [ ] Email pre-filled
  - [ ] Can enter company name
  - [ ] Click "Next" to proceed
- [ ] Step 2 - Role:
  - [ ] Can select role from dropdown
  - [ ] Can select investment stage
  - [ ] Click "Next" to proceed
- [ ] Step 3 - Confirmation:
  - [ ] See checkmark icon
  - [ ] See "All set!" message
  - [ ] Click "Get Started"
- [ ] Should redirect to `/dashboard`

### Test Dashboard

- [ ] Dashboard page loads
- [ ] Sidebar visible with "Kunfa AI" title
- [ ] User info displayed (name, role, avatar)
- [ ] Statistics cards visible (Total Deals, Saved Deals, This Month)
- [ ] Logout button functional

### Test Session Persistence

- [ ] Logged in on dashboard
- [ ] Refresh page (F5)
- [ ] Should stay logged in on dashboard
- [ ] Go to `/login`
- [ ] Should redirect to `/dashboard` (authenticated redirect)

### Test Route Protection

- [ ] Open new incognito/private window
- [ ] Navigate to `http://localhost:3000/dashboard`
- [ ] Should redirect to `/login`
- [ ] Navigate to `http://localhost:3000`
- [ ] Should redirect to `/login` (unauthenticated)

### Test Email Authentication (Optional)

- [ ] Go to Supabase Dashboard → Authentication → Users
- [ ] Create test user with email/password
- [ ] Go to login page
- [ ] Enter test email and password
- [ ] Click "Sign In"
- [ ] Should redirect to dashboard

### Test Logout

- [ ] Click logout button in dashboard
- [ ] Should redirect to `/login`
- [ ] Try going to `/dashboard`
- [ ] Should redirect to `/login` (session cleared)

## Phase 6: Code Review Checklist

- [ ] All required files created:
  - [ ] `src/middleware.ts`
  - [ ] `src/lib/auth.ts`
  - [ ] `src/lib/supabase.ts`
  - [ ] `src/app/layout.tsx`
  - [ ] `src/app/page.tsx`
  - [ ] `src/app/globals.css`
  - [ ] `src/app/(auth)/layout.tsx`
  - [ ] `src/app/(auth)/login/page.tsx`
  - [ ] `src/app/api/auth/linkedin/route.ts`
  - [ ] `src/app/api/auth/callback/route.ts`
  - [ ] `src/app/api/auth/email/route.ts`
  - [ ] `src/app/onboarding/page.tsx`
  - [ ] `src/app/dashboard/page.tsx`
  - [ ] `database.sql`

- [ ] No TypeScript errors:
  ```bash
  npm run build
  ```

- [ ] No console errors in browser DevTools (F12)

- [ ] Environment variables used correctly:
  - [ ] `NEXT_PUBLIC_*` vars used only in browser code
  - [ ] `LINKEDIN_CLIENT_SECRET` only used server-side

## Phase 7: Security Review

- [ ] `.env.local` is in `.gitignore`
  ```bash
  cat .gitignore | grep env
  ```

- [ ] Supabase RLS policies are enabled
  - [ ] Go to Supabase Dashboard
  - [ ] Navigate to Database → Tables → users
  - [ ] Check "Enable RLS" is toggled on
  - [ ] Verify policies exist

- [ ] Middleware is protecting routes
  - [ ] Check network tab in DevTools
  - [ ] Unauthenticated requests to `/dashboard` redirect

- [ ] LinkedIn redirect URI only uses production domain:
  - [ ] LinkedIn settings should have: `http://localhost:3000/api/auth/callback`
  - [ ] No exposed secrets in code

## Phase 8: Production Preparation

When ready to deploy:

- [ ] Create production Supabase project (or use separate environment)
- [ ] Update LinkedIn OAuth settings:
  - [ ] Add production redirect URI: `https://yourdomain.com/api/auth/callback`
- [ ] Create production environment file (securely):
  - [ ] Set `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
  - [ ] Update all Supabase keys for production
  - [ ] Add production LinkedIn credentials
- [ ] Run security scan:
  ```bash
  npm audit
  ```
- [ ] Test all flows in staging environment
- [ ] Set up monitoring/logging
- [ ] Configure HTTPS (required for production OAuth)
- [ ] Test CORS settings if needed

## Phase 9: Documentation & Handoff

- [ ] Developers have access to:
  - [ ] Supabase project
  - [ ] LinkedIn Developer app
  - [ ] Environment variables
- [ ] Documentation reviewed:
  - [ ] `AUTHENTICATION_SETUP.md` - Complete
  - [ ] `AUTHENTICATION_SUMMARY.md` - Complete
  - [ ] Code comments clear and helpful
- [ ] Team trained on:
  - [ ] How to use LinkedIn OAuth
  - [ ] How to manage users in Supabase
  - [ ] How to troubleshoot auth issues
  - [ ] How to extend auth (add more providers)

## Phase 10: Monitoring & Maintenance

- [ ] Set up error tracking:
  - [ ] Sentry/Rollbar for production errors
  - [ ] Log failed login attempts
- [ ] Monitor:
  - [ ] Login success rate
  - [ ] OAuth errors
  - [ ] Session refresh performance
  - [ ] Database query performance
- [ ] Regular maintenance:
  - [ ] Review Supabase logs weekly
  - [ ] Monitor LinkedIn API changes
  - [ ] Update dependencies monthly
  - [ ] Review security advisories

## Troubleshooting Quick Links

If you encounter issues:

1. **LinkedIn Redirect URI Error:**
   - Check NEXT_PUBLIC_APP_URL environment variable
   - Verify redirect URI in LinkedIn app settings
   - See: AUTHENTICATION_SETUP.md → Troubleshooting

2. **Missing Environment Variables:**
   - Copy .env.example to .env.local
   - Fill in all required values
   - Restart dev server

3. **RLS Policy Errors:**
   - Run database.sql again
   - Check user_id matches auth.uid()
   - See: AUTHENTICATION_SETUP.md → Troubleshooting

4. **Session Not Persisting:**
   - Check cookies enabled
   - Verify Supabase credentials
   - Check middleware is running
   - See: AUTHENTICATION_SETUP.md → Troubleshooting

5. **Other Issues:**
   - Read AUTHENTICATION_SETUP.md completely
   - Check browser console (F12)
   - Check server logs
   - Check Supabase logs in dashboard

## Estimated Time

- Phase 1 (Supabase): 15 minutes
- Phase 2 (LinkedIn): 20 minutes
- Phase 3 (Environment): 5 minutes
- Phase 4 (Setup): 10 minutes
- Phase 5 (Testing): 30 minutes
- Phase 6-10 (Review/Deploy): 30 minutes

**Total: ~2 hours for complete setup**

## Success Criteria

You'll know everything is working when:

✓ You can log in with LinkedIn
✓ User appears in Supabase auth and database
✓ Onboarding completes successfully
✓ Dashboard loads after auth
✓ Session persists across page refreshes
✓ Logout clears session
✓ Unauthenticated users can't access `/dashboard`
✓ No console errors in browser
✓ No TypeScript errors in build
✓ `.env.local` is not committed to git

---

**Status:** [ ] Complete

**Completed by:** _______________

**Date:** _______________

**Notes:**
```
[Add any notes, issues, or customizations here]
```
