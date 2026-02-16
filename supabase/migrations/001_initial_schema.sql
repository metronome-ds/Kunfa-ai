-- Kunfa AI Database Schema Migration
-- Comprehensive schema for investment and deal management platform

-- ============================================================================
-- HELPER FUNCTION: Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TABLE 1: USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    linkedin_id VARCHAR(255) UNIQUE,
    linkedin_profile_url TEXT,
    avatar_url TEXT,
    headline VARCHAR(255),
    company VARCHAR(255),
    location VARCHAR(255),
    bio TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'investor',
    user_type VARCHAR(50),
    interests JSONB DEFAULT '[]'::jsonb,
    verified_at TIMESTAMPTZ,
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_linkedin_id ON users(linkedin_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Users RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users visible to all" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users editable by owner" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insertable by auth" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Updated at trigger for users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 2: DEALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    stage VARCHAR(50),
    funding_amount DECIMAL(18,2),
    valuation DECIMAL(18,2),
    deal_type VARCHAR(50),
    problem_statement TEXT,
    solution TEXT,
    market_size TEXT,
    team_size INTEGER,
    website VARCHAR(500),
    pitch_deck_url TEXT,
    ai_score_overall DECIMAL(5,1),
    ai_score_team DECIMAL(5,1),
    ai_score_market DECIMAL(5,1),
    ai_score_traction DECIMAL(5,1),
    ai_score_product DECIMAL(5,1),
    ai_score_financials DECIMAL(5,1),
    ai_score_competitive_landscape DECIMAL(5,1),
    ai_score_metadata JSONB DEFAULT '{}'::jsonb,
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals indexes
CREATE INDEX idx_deals_creator_id ON deals(creator_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_created_at ON deals(created_at);
CREATE INDEX idx_deals_industry ON deals(industry);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_ai_score_overall ON deals(ai_score_overall);

-- Deals RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deals visible if active" ON deals
    FOR SELECT USING (status = 'active');

CREATE POLICY "Deals editable by creator" ON deals
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Deals insertable by auth user" ON deals
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Deals deletable by creator" ON deals
    FOR DELETE USING (auth.uid() = creator_id);

-- Updated at trigger for deals
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 3: DEAL_DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS deal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    document_type VARCHAR(50),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    parsed_text TEXT,
    parsed_metadata JSONB DEFAULT '{}'::jsonb,
    parse_status VARCHAR(50) DEFAULT 'pending',
    parse_error TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal documents indexes
CREATE INDEX idx_deal_documents_deal_id ON deal_documents(deal_id);
CREATE INDEX idx_deal_documents_uploaded_by ON deal_documents(uploaded_by);
CREATE INDEX idx_deal_documents_document_type ON deal_documents(document_type);
CREATE INDEX idx_deal_documents_parse_status ON deal_documents(parse_status);
CREATE INDEX idx_deal_documents_created_at ON deal_documents(created_at);

-- Deal documents RLS
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents visible to creator and pipeline users" ON deal_documents
    FOR SELECT USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM deals d WHERE d.id = deal_documents.deal_id AND d.creator_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM deal_pipeline dp WHERE dp.deal_id = deal_documents.deal_id AND dp.user_id = auth.uid()
        )
    );

CREATE POLICY "Documents insertable by auth user" ON deal_documents
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Documents deletable by uploader" ON deal_documents
    FOR DELETE USING (uploaded_by = auth.uid());

-- ============================================================================
-- TABLE 4: DEAL_PIPELINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deal_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    current_stage VARCHAR(50) NOT NULL,
    stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    next_steps TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, deal_id)
);

-- Deal pipeline indexes
CREATE INDEX idx_deal_pipeline_user_id ON deal_pipeline(user_id);
CREATE INDEX idx_deal_pipeline_deal_id ON deal_pipeline(deal_id);
CREATE INDEX idx_deal_pipeline_current_stage ON deal_pipeline(current_stage);
CREATE INDEX idx_deal_pipeline_follow_up_date ON deal_pipeline(follow_up_date);

-- Deal pipeline RLS
ALTER TABLE deal_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pipeline private to user" ON deal_pipeline
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Pipeline insertable by user" ON deal_pipeline
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pipeline editable by user" ON deal_pipeline
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Pipeline deletable by user" ON deal_pipeline
    FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger for deal_pipeline
CREATE TRIGGER update_deal_pipeline_updated_at BEFORE UPDATE ON deal_pipeline
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 5: SAVED_DEALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(user_id, deal_id)
);

-- Saved deals indexes
CREATE INDEX idx_saved_deals_user_id ON saved_deals(user_id);
CREATE INDEX idx_saved_deals_deal_id ON saved_deals(deal_id);
CREATE INDEX idx_saved_deals_saved_at ON saved_deals(saved_at);

-- Saved deals RLS
ALTER TABLE saved_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Saved deals private to user" ON saved_deals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Saved deals insertable by user" ON saved_deals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Saved deals deletable by user" ON saved_deals
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE 6: PORTFOLIO_HOLDINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    investment_amount DECIMAL(18,2),
    investment_date DATE,
    equity_percent DECIMAL(5,2),
    current_valuation DECIMAL(18,2),
    valuation_date DATE,
    multiple DECIMAL(8,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio holdings indexes
CREATE INDEX idx_portfolio_holdings_user_id ON portfolio_holdings(user_id);
CREATE INDEX idx_portfolio_holdings_deal_id ON portfolio_holdings(deal_id);
CREATE INDEX idx_portfolio_holdings_status ON portfolio_holdings(status);
CREATE INDEX idx_portfolio_holdings_investment_date ON portfolio_holdings(investment_date);

-- Portfolio holdings RLS
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio private to user" ON portfolio_holdings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Portfolio insertable by user" ON portfolio_holdings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Portfolio editable by user" ON portfolio_holdings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Portfolio deletable by user" ON portfolio_holdings
    FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger for portfolio_holdings
CREATE TRIGGER update_portfolio_holdings_updated_at BEFORE UPDATE ON portfolio_holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 7: ENGAGEMENT_SCORE
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagement_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    deals_viewed INTEGER DEFAULT 0,
    deals_saved INTEGER DEFAULT 0,
    connections_made INTEGER DEFAULT 0,
    deals_posted INTEGER DEFAULT 0,
    documents_uploaded INTEGER DEFAULT 0,
    score_value INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ
);

-- Engagement score indexes
CREATE INDEX idx_engagement_score_user_id ON engagement_score(user_id);
CREATE INDEX idx_engagement_score_score_value ON engagement_score(score_value);
CREATE INDEX idx_engagement_score_last_calculated_at ON engagement_score(last_calculated_at);

-- Engagement score RLS
ALTER TABLE engagement_score ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Engagement score private to user" ON engagement_score
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Engagement score insertable by user" ON engagement_score
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Engagement score editable by user" ON engagement_score
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE 8: TEAM_MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(50) DEFAULT 'pending',
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

-- Team members indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_invited_by ON team_members(invited_by);
CREATE INDEX idx_team_members_status ON team_members(status);
CREATE INDEX idx_team_members_invited_at ON team_members(invited_at);

-- Team members RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members private to team members" ON team_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        invited_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Team members insertable by inviter" ON team_members
    FOR INSERT WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Team members updatable by user or inviter" ON team_members
    FOR UPDATE USING (user_id = auth.uid() OR invited_by = auth.uid());

-- ============================================================================
-- TABLE 9: SERVICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hourly_rate DECIMAL(10,2),
    availability_status VARCHAR(50) DEFAULT 'available',
    expertise_areas JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services indexes
CREATE INDEX idx_services_provider_id ON services(provider_id);
CREATE INDEX idx_services_service_type ON services(service_type);
CREATE INDEX idx_services_availability_status ON services(availability_status);
CREATE INDEX idx_services_created_at ON services(created_at);

-- Services RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services visible to all" ON services
    FOR SELECT USING (true);

CREATE POLICY "Services insertable by provider" ON services
    FOR INSERT WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Services editable by provider" ON services
    FOR UPDATE USING (auth.uid() = provider_id);

CREATE POLICY "Services deletable by provider" ON services
    FOR DELETE USING (auth.uid() = provider_id);

-- Updated at trigger for services
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 10: AI_SCORING_LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_scoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    documents_analyzed JSONB DEFAULT '[]'::jsonb,
    prompt_used TEXT,
    model_used VARCHAR(50),
    raw_response TEXT,
    parsed_scores JSONB DEFAULT '{}'::jsonb,
    tokens_used INTEGER,
    api_cost DECIMAL(10,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI scoring logs indexes
CREATE INDEX idx_ai_scoring_logs_deal_id ON ai_scoring_logs(deal_id);
CREATE INDEX idx_ai_scoring_logs_model_used ON ai_scoring_logs(model_used);
CREATE INDEX idx_ai_scoring_logs_created_at ON ai_scoring_logs(created_at);

-- AI scoring logs RLS
ALTER TABLE ai_scoring_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scoring logs visible to deal creator" ON ai_scoring_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deals d WHERE d.id = ai_scoring_logs.deal_id AND d.creator_id = auth.uid()
        )
    );

-- ============================================================================
-- SUPABASE STORAGE BUCKET SETUP
-- ============================================================================

-- Create documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for documents bucket
CREATE POLICY "Documents uploadable by auth users" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Documents downloadable by auth users" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Documents deletable by uploader" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND
        auth.uid() = owner
    );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.deals TO authenticated;
GRANT ALL ON public.deal_documents TO authenticated;
GRANT ALL ON public.deal_pipeline TO authenticated;
GRANT ALL ON public.saved_deals TO authenticated;
GRANT ALL ON public.portfolio_holdings TO authenticated;
GRANT ALL ON public.engagement_score TO authenticated;
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.services TO authenticated;
GRANT ALL ON public.ai_scoring_logs TO authenticated;
