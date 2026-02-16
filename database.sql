-- Users table for storing user profiles
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  linkedin_id VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  name VARCHAR(255),
  avatar_url TEXT,
  headline VARCHAR(255),
  company VARCHAR(255),
  role VARCHAR(50),
  investment_stage VARCHAR(50),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_supabase_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON public.users(linkedin_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Create RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Allow inserting user profiles during signup
CREATE POLICY "Allow insert during signup"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Deals table (placeholder for future use)
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  company_name VARCHAR(255),
  funding_amount BIGINT,
  funding_stage VARCHAR(50),
  source VARCHAR(100),
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_user_id ON public.deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON public.deals(created_at DESC);

-- Watchlist table (placeholder for future use)
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
