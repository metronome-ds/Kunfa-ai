-- ============================================================================
-- Kunfa AI - Team Management, Services Marketplace & People Directory
-- Database Schema (Phases 10 & 13)
-- ============================================================================

-- ============================================================================
-- 1. Team Members Table
-- ============================================================================
-- Stores team member records with roles and status

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  user_id UUID,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Foreign key to users table
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

  -- Unique constraint: one role per user per team
  UNIQUE(team_id, user_id),
  UNIQUE(team_id, email)
);

-- Create indexes for common queries
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_team_members_status ON team_members(status);

-- ============================================================================
-- 2. Services Listings Table
-- ============================================================================
-- Stores service provider listings

CREATE TABLE IF NOT EXISTS services_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (
    service_type IN ('legal', 'accounting', 'hr', 'compliance', 'consulting')
  ),
  hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  expertise_areas TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  certifications TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Foreign key to users table
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX idx_services_listings_provider_id ON services_listings(provider_id);
CREATE INDEX idx_services_listings_service_type ON services_listings(service_type);
CREATE INDEX idx_services_listings_hourly_rate ON services_listings(hourly_rate);
CREATE INDEX idx_services_listings_created_at ON services_listings(created_at DESC);

-- Create GIN index for full-text search on title and description
CREATE INDEX idx_services_listings_title_tsvector
  ON services_listings
  USING GIN (to_tsvector('english', title || ' ' || description));

-- ============================================================================
-- 3. Update users table (if needed)
-- ============================================================================
-- These columns should already exist but verify they are present

-- Add team_id to users table if not present
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID;

-- Add is_service_provider boolean if needed for quick filtering
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS is_service_provider BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 4. Engagement Scores Table (already exists, but included for reference)
-- ============================================================================
-- Used for tracking connections between people

-- This table should already exist from Phase 9
-- verify the structure matches:
/*
CREATE TABLE IF NOT EXISTS engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  deal_id UUID NOT NULL,
  views INT DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  documents_reviewed INT DEFAULT 0,
  notes_added INT DEFAULT 0,
  shared_count INT DEFAULT 0,
  time_spent_seconds INT DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  UNIQUE(user_id, deal_id)
);
*/

-- ============================================================================
-- 5. Enable Row Level Security (RLS) Policies
-- ============================================================================
-- These policies ensure users can only access their own team data

-- Enable RLS on team_members table
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow users to view team members of their own team
CREATE POLICY "Users can view team members in their team"
  ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      WHERE u1.user_id = auth.uid()
      AND u1.team_id = team_members.team_id
    )
  );

-- Allow admins to modify team members
CREATE POLICY "Admins can manage team members"
  ON team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = (SELECT id FROM users WHERE user_id = auth.uid())
      AND tm.role = 'admin'
    )
  );

-- Allow team owners to delete team members
CREATE POLICY "Team owners can remove members"
  ON team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = (SELECT id FROM users WHERE user_id = auth.uid())
      AND tm.role = 'admin'
    )
  );

-- Enable RLS on services_listings table
ALTER TABLE services_listings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view services
CREATE POLICY "Anyone can view services"
  ON services_listings
  FOR SELECT
  USING (true);

-- Allow providers to create services
CREATE POLICY "Users can create services"
  ON services_listings
  FOR INSERT
  WITH CHECK (
    provider_id = (SELECT id FROM users WHERE user_id = auth.uid())
  );

-- Allow providers to update their own services
CREATE POLICY "Providers can update their services"
  ON services_listings
  FOR UPDATE
  USING (
    provider_id = (SELECT id FROM users WHERE user_id = auth.uid())
  );

-- Allow providers to delete their own services
CREATE POLICY "Providers can delete their services"
  ON services_listings
  FOR DELETE
  USING (
    provider_id = (SELECT id FROM users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 6. Database Triggers
-- ============================================================================
-- Update updated_at column on changes

CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_members_updated_at_trigger
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_members_updated_at();

CREATE OR REPLACE FUNCTION update_services_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_listings_updated_at_trigger
  BEFORE UPDATE ON services_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_services_listings_updated_at();

-- ============================================================================
-- 7. Sample Data (Optional - for testing)
-- ============================================================================
-- Uncomment to insert test data after authentication is set up

/*
-- Insert test team member
INSERT INTO team_members (team_id, user_id, email, role, status)
VALUES (
  'test-team-uuid',
  'test-user-uuid',
  'member@example.com',
  'member',
  'pending'
);

-- Insert test service listing
INSERT INTO services_listings (provider_id, title, description, service_type, hourly_rate, expertise_areas)
VALUES (
  'provider-user-uuid',
  'Legal Consultation for Startups',
  'Expert legal advice for startup companies including incorporation, term sheets, and IP protection.',
  'legal',
  150.00,
  ARRAY['Startup Law', 'IP Protection', 'Term Sheet Review']
);
*/

-- ============================================================================
-- 8. Verification Queries
-- ============================================================================
-- Run these to verify the schema is set up correctly

/*
-- Check team_members table
SELECT * FROM information_schema.tables WHERE table_name = 'team_members';
SELECT * FROM team_members LIMIT 5;

-- Check services_listings table
SELECT * FROM information_schema.tables WHERE table_name = 'services_listings';
SELECT * FROM services_listings LIMIT 5;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'team_members';
SELECT * FROM pg_policies WHERE tablename = 'services_listings';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'team_members';
SELECT indexname FROM pg_indexes WHERE tablename = 'services_listings';
*/

-- ============================================================================
-- End of Schema
-- ============================================================================
