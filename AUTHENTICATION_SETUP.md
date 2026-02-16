# Kunfa AI - Authentication Setup Guide

This document outlines the complete authentication system for Kunfa AI, a Next.js 14+ application with LinkedIn OAuth and email/password login.

## Overview

The authentication system consists of:
- **LinkedIn OAuth 2.0** - Primary authentication method
- **Email/Password Auth** - For development and testing
- **Supabase** - Auth provider and database
- **Session Management** - Using @supabase/ssr with middleware
- **Role-Based Access Control** - Via middleware on protected routes

## Architecture

```
User
  ↓
┌─────────────────────┐
│  Login Page         │
│  - LinkedIn         │
│  - Email/Password   │
└──────────┬──────────┘
           ↓
┌─────────────────────────────────┐
│ API Routes                      │
│ - /api/auth/linkedin            │
│ - /api/auth/callback            │
│ - /api/auth/email               │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ Supabase Auth + Database        │
│ - User authentication           │
│ - User profile storage          │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ Session/Middleware              │
│ - Session refresh on each req    │
│ - Route protection              │
│ - Redirect logic                │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ Protected Pages                 │
│ - /dashboard                    │
│ - /onboarding                   │
│ - Other authenticated routes    │
└─────────────────────────────────┘
```

## File Structure

```
src/
├── middleware.ts                 # Session refresh + route protection
├── lib/
│   ├── auth.ts                  # Server-side Supabase client
│   └── supabase.ts              # Client-side Supabase client
├── app/
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Redirect to login/dashboard
│   ├── globals.css              # Theme + styles
│   ├── (auth)/                  # Auth group layout
│   │   ├── layout.tsx           # Centered card layout
│   │   └── login/
│   │       └── page.tsx         # Login page
│   ├── api/auth/
│   │   ├── linkedin/
│   │   │   └── route.ts         # Initiate LinkedIn OAuth
│   │   ├── callback/
│   │   │   └── route.ts         # LinkedIn OAuth callback
│   │   └── email/
│   │       └── route.ts         # Email/password auth
│   ├── dashboard/
│   │   └── page.tsx             # Main dashboard
│   └── onboarding/
│       └── page.tsx             # Onboarding flow
```

## Environment Variables

Create a `.env.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LinkedIn OAuth
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=your-client-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
LINKEDIN_CLIENT_SECRET=your-client-secret

# Node Environment
NODE_ENV=development
```

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema from `database.sql`:
   ```sql
   -- Paste the entire database.sql file into Supabase SQL Editor
   ```
3. Enable Auth with email/password:
   - Go to Authentication → Providers
   - Enable Email provider
   - Set up SMTP if needed

### 2. LinkedIn OAuth Setup

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Create a new application
3. In App credentials:
   - Copy Client ID → `NEXT_PUBLIC_LINKEDIN_CLIENT_ID`
   - Copy Client Secret → `LINKEDIN_CLIENT_SECRET`
4. In Authorized redirect URLs, add:
   - `http://localhost:3000/api/auth/callback` (development)
   - `https://yourdomain.com/api/auth/callback` (production)
5. Request access to Sign In with LinkedIn API
6. Request access to these scopes:
   - `openid` - Required for Sign In with LinkedIn
   - `profile` - Access to profile data
   - `email` - Access to email address

### 3. Database Schema

The `database.sql` file creates:

- **users** table - Stores user profiles
  - `user_id` (FK to auth.users)
  - `linkedin_id` (for LinkedIn OAuth)
  - `email`, `name`, `avatar_url`
  - `company`, `role`, `investment_stage`
  - `onboarding_completed` (boolean)

- **deals** table - For future deal tracking
- **watchlist** table - For saved deals
- Row-level security (RLS) policies

### 4. Environment Setup

```bash
# Copy example to actual env file
cp .env.example .env.local

# Fill in your actual credentials
nano .env.local
```

## Authentication Flow

### LinkedIn OAuth Flow

```
1. User clicks "Sign in with LinkedIn"
2. GET /api/auth/linkedin
   - Generate state (CSRF token)
   - Store state in httpOnly cookie
   - Redirect to LinkedIn OAuth
3. User authorizes on LinkedIn.com
4. LinkedIn redirects to /api/auth/callback with code + state
5. Exchange code for access token (server-to-server)
6. Fetch user profile from LinkedIn API
7. Create/update user in Supabase
8. Create session
9. Redirect to /onboarding or /dashboard
```

### Email/Password Flow

```
1. User enters email + password
2. POST /api/auth/email
3. Authenticate with Supabase
4. Create/update user profile if needed
5. Return user session
6. Redirect to /dashboard
```

## Middleware & Session Management

`src/middleware.ts` handles:

- **Session Refresh** - Refreshes auth session on every request
- **Route Protection** - Redirects unauthenticated users from /dashboard/* to /login
- **Authenticated Redirect** - Redirects logged-in users from /login to /dashboard
- **CSRF Protection** - Validates state on OAuth callback

Protected routes:
- `/dashboard/*` - Requires authentication
- `/onboarding` - Requires authentication
- `/api/*` - Some endpoints require auth

Public routes:
- `/` - Redirects based on auth status
- `/login` - Always accessible
- `/api/auth/*` - Always accessible

## API Routes

### GET /api/auth/linkedin

Initiates LinkedIn OAuth flow.

**Returns:** Redirect to LinkedIn authorization URL

**Sets:** `linkedin_state` httpOnly cookie (10 min expiry)

### GET /api/auth/callback

Handles LinkedIn OAuth callback.

**Query params:**
- `code` - Authorization code from LinkedIn
- `state` - CSRF state token
- `error` - Error message (if authorization failed)

**Returns:** Redirect to /dashboard or /onboarding

**Creates/Updates:**
- Auth user in Supabase
- User profile in database

### POST /api/auth/email

Email/password authentication.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Returns:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "onboarding_completed": false
  }
}
```

## Client-Side Auth Utilities

### `src/lib/supabase.ts`

Client-side Supabase initialization:

```typescript
import { supabase } from '@/lib/supabase';

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();

// Get session
const { data: { session } } = await supabase.auth.getSession();
```

### `src/lib/auth.ts`

Server-side Supabase client:

```typescript
import { createClient } from '@/lib/auth';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

## Pages & Components

### `/login`

Clean, modern login page with:
- LinkedIn OAuth button (primary)
- Email/password form (secondary)
- Error handling
- Dark theme with blue accents

### `/onboarding`

Multi-step onboarding flow:
- Step 1: Confirm name, email, enter company
- Step 2: Select role and investment stage
- Step 3: Confirmation and redirect to dashboard

### `/dashboard`

Main authenticated dashboard with:
- Sidebar navigation
- User profile section
- Deal statistics cards
- Placeholder for future features

## Styling & Theme

Colors defined in `src/app/globals.css`:

```css
--primary-deep: #1a1f36;      /* Dark blue */
--primary-accent: #3b82f6;    /* Bright blue */
--sidebar-bg: #0f1419;        /* Very dark */
--card-bg: #ffffff;           /* White */
--success: #10b981;           /* Green */
--warning: #f59e0b;           /* Amber */
--error: #ef4444;             /* Red */
```

Uses Tailwind CSS for component styling.

## Security Considerations

1. **CSRF Protection**
   - State token generated for LinkedIn OAuth
   - Stored in httpOnly cookie
   - Validated on callback

2. **Session Security**
   - Refresh session on every request (middleware)
   - httpOnly cookies for sensitive data
   - Secure flag in production

3. **Row-Level Security (RLS)**
   - Users can only see their own data
   - Database policies enforce access control

4. **Environment Variables**
   - Secrets never exposed in frontend code
   - LinkedIn secret only on server
   - NEXT_PUBLIC_* prefix for browser-safe vars

5. **Password Security**
   - Handled entirely by Supabase Auth
   - Never stored in plain text
   - Hashed and salted by Supabase

## Troubleshooting

### LinkedIn Redirect URI Mismatch

**Error:** "Redirect URI mismatch" from LinkedIn

**Solution:**
1. Go to LinkedIn Developer App settings
2. Add your callback URL to "Authorized redirect URLs"
3. Ensure it matches `NEXT_PUBLIC_APP_URL + /api/auth/callback`

### Missing Environment Variables

**Error:** "Missing environment variables" at startup

**Solution:**
1. Copy `.env.example` to `.env.local`
2. Fill in all required values
3. Restart development server

### Session Not Persisting

**Error:** User logged out after page refresh

**Solution:**
1. Check that middleware is running (should see requests to middleware)
2. Ensure cookies are enabled
3. Check NEXT_PUBLIC_SUPABASE_URL and ANON_KEY are correct

### RLS Policy Errors

**Error:** "new row violates row level security policy"

**Solution:**
1. Check that user_id in database matches auth.uid()
2. Run the database.sql schema again
3. Verify RLS policies are correctly set

## Testing

### Test LinkedIn OAuth Locally

1. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
2. Add `http://localhost:3000/api/auth/callback` to LinkedIn redirect URIs
3. Click "Sign in with LinkedIn" button
4. Authorize and check database for user creation

### Test Email/Password

1. Create a test user via Supabase dashboard
2. Or POST to `/api/auth/email` with test credentials
3. Check that user is created in `users` table

### Test Protected Routes

1. Try accessing `/dashboard` without logging in
2. Should redirect to `/login`
3. Log in and should be able to access

## Future Enhancements

- [ ] Google OAuth
- [ ] GitHub OAuth
- [ ] Two-factor authentication
- [ ] Social login profile enrichment
- [ ] Team/organization support
- [ ] Single sign-on (SSO)
- [ ] Account deactivation/deletion
- [ ] Password reset flow
- [ ] Email verification
- [ ] Activity logging

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [LinkedIn Sign In API](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [Tailwind CSS](https://tailwindcss.com/)

## Support

For issues or questions:
1. Check this documentation
2. Review the troubleshooting section
3. Check Supabase logs in dashboard
4. Review Next.js console for errors
