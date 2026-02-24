/**
 * Core TypeScript types for Kunfa AI deal flow platform
 */

// User role enum
export type UserRole = 'founder' | 'investor' | 'scout' | 'analyst' | 'admin';

// Deal stage enum
export type DealStage =
  | 'pre-seed'
  | 'seed'
  | 'series-a'
  | 'series-b'
  | 'series-c'
  | 'series-d'
  | 'series-d+';

// Pipeline stage enum
export type PipelineStage = 'sourcing' | 'screening' | 'diligence' | 'close';

// Deal status enum
export type DealStatus = 'active' | 'closed' | 'rejected' | 'archived';

// Service type enum
export type ServiceType = 'due_diligence' | 'term_sheet_review' | 'financial_analysis' | 'market_research';

// Document type enum
export type DocumentType = 'pitch_deck' | 'executive_summary' | 'financial_statement' | 'term_sheet' | 'other';

// Portfolio holding status
export type PortfolioHoldingStatus = 'active' | 'exited' | 'written_off';

/**
 * User entity - represents a person using the platform
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;

  // LinkedIn integration fields
  linkedin_url: string | null;
  linkedin_id: string | null;
  linkedin_verified: boolean;

  // User interests and focus areas
  interests: string[]; // e.g., ['B2B SaaS', 'AI', 'Climate Tech']
  industry_focus: string[];
  stage_preference: DealStage[];

  // Metadata
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/**
 * Scoring dimensions for AI analysis
 */
export interface ScoringDimensions {
  team: number; // 0-100, weight: 25%
  market: number; // 0-100, weight: 20%
  traction: number; // 0-100, weight: 20%
  product: number; // 0-100, weight: 15%
  financials: number; // 0-100, weight: 10%
  competitive_landscape: number; // 0-100, weight: 10%
}

/**
 * Deal entity - represents an investment opportunity
 */
export interface Deal {
  id: string;
  title: string;
  company_name: string;
  description: string | null;
  industry: string;
  stage: string;
  status: string;
  creator_id: string;

  // Valuation and funding info
  funding_amount: number | null;
  valuation: number | null;
  deal_type: string | null;

  // Company info
  website: string | null;
  pitch_deck_url: string | null;
  problem_statement: string | null;
  solution: string | null;
  market_size: string | null;
  team_size: number | null;

  // AI Scoring
  ai_score_overall: number | null;
  ai_score_team: number | null;
  ai_score_market: number | null;
  ai_score_traction: number | null;
  ai_score_product: number | null;
  ai_score_financials: number | null;
  ai_score_competitive_landscape: number | null;
  ai_score_metadata: Record<string, any> | null;

  // Engagement
  view_count: number;
  save_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Deal document - uploaded or referenced documents for deals
 */
export interface DealDocument {
  id: string;
  deal_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  parsed_text: string | null;
  parsed_metadata: Record<string, any> | null;
  parse_status: string;
  parse_error: string | null;
  uploaded_by: string;
  created_at: string;
}

/**
 * Deal pipeline - tracks movement through stages
 */
export interface DealPipeline {
  id: string;
  deal_id: string;

  // Stage tracking
  sourcing_stage: {
    status: boolean;
    entered_at: string | null;
    exited_at: string | null;
    notes: string | null;
  };

  screening_stage: {
    status: boolean;
    entered_at: string | null;
    exited_at: string | null;
    notes: string | null;
  };

  diligence_stage: {
    status: boolean;
    entered_at: string | null;
    exited_at: string | null;
    notes: string | null;
  };

  close_stage: {
    status: boolean;
    entered_at: string | null;
    exited_at: string | null;
    notes: string | null;
  };

  // Current stage
  current_stage: PipelineStage;
  expected_close_date: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Saved deal - user's personal saved deals (watchlist)
 */
export interface SavedDeal {
  id: string;
  user_id: string;
  deal_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Portfolio holding - represents an investment made
 */
export interface PortfolioHolding {
  id: string;
  deal_id: string;
  investor_id: string; // User ID

  // Investment details
  investment_amount: number;
  equity_percentage: number;
  status: PortfolioHoldingStatus;
  entry_valuation: number;
  current_valuation: number | null;

  // Exit info (if applicable)
  exit_type: 'acquisition' | 'ipo' | 'written_off' | null;
  exit_date: string | null;
  exit_amount: number | null;

  // Metadata
  invested_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Engagement score - tracks user engagement with deals
 */
export interface EngagementScore {
  id: string;
  user_id: string;
  deal_id: string;

  // Engagement metrics
  views: number;
  last_viewed_at: string | null;
  documents_reviewed: number;
  notes_added: number;
  shared_count: number;
  time_spent_seconds: number;

  // Engagement score (0-100)
  score: number;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Team member - represents a person on the team
 */
export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;

  // Team role and permissions
  role: 'admin' | 'member' | 'viewer';
  permissions: string[]; // e.g., ['view_deals', 'score_deals', 'share_deals']

  // Status
  is_active: boolean;
  joined_at: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Service - represents a service offered for deals
 */
export interface Service {
  id: string;
  deal_id: string;
  service_type: ServiceType;
  provider: string; // e.g., 'Internal', 'External Partner Name'

  // Service details
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  requested_by: string; // User ID
  assigned_to: string | null; // User ID
  description: string | null;

  // Dates
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;

  // Results
  result_url: string | null;
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * AI Scoring log - audit trail for scoring operations
 */
export interface AIScoringLog {
  id: string;
  deal_id: string;
  documents_analyzed: number;
  total_tokens_used: number;
  cost_estimate: number;

  // Scoring results
  overall_score: number;
  dimensions: ScoringDimensions;
  red_flags: string[];
  green_flags: string[];

  // Execution details
  model_used: string;
  started_at: string;
  completed_at: string;
  execution_time_ms: number;

  // Metadata
  created_by: string; // User ID
  created_at: string;
}

/**
 * Scoring response from Claude API
 */
export interface ScoringResponse {
  overall_score: number;
  dimensions: ScoringDimensions;
  summary: string;
  red_flags: string[];
  green_flags: string[];
  confidence_level: 'high' | 'medium' | 'low';
}

/**
 * Company brief - AI-generated summary of company
 */
export interface CompanyBrief {
  id: string;
  deal_id: string;

  // Core information
  company_name: string;
  tagline: string;
  mission: string;
  executive_summary: string;

  // Business details
  target_market: string;
  product_description: string;
  business_model: string;
  go_to_market_strategy: string;

  // Team highlights
  founding_team: string;
  key_experience: string;

  // Traction
  key_metrics: string;
  recent_milestones: string;

  // Financials overview
  revenue_model: string;
  unit_economics: string | null;
  financial_highlights: string | null;

  // Metadata
  generated_by: string; // User ID (of Claude service)
  created_at: string;
  updated_at: string;
}

/**
 * Term sheet analysis - AI analysis of term sheet documents
 */
export interface TermSheetAnalysis {
  id: string;
  deal_id: string;
  document_id: string;

  // Deal terms
  investment_amount: number;
  valuation: number;
  equity_percentage: number;
  liquidation_preference: string;

  // Key terms analysis
  dilution_analysis: string;
  anti_dilution_provisions: string;
  board_composition: string;
  voting_rights: string;

  // Risk assessment
  favorable_terms: string[];
  unfavorable_terms: string[];
  negotiation_priorities: string[];

  // Overall assessment
  deal_quality_score: number; // 0-100
  key_insights: string;
  red_flags: string[];

  // Metadata
  analyzed_by: string; // User ID (of Claude service)
  created_at: string;
  updated_at: string;
}

/**
 * Type-safe constants for use throughout the application
 */
export const USER_ROLE_VALUES: UserRole[] = ['founder', 'investor', 'scout', 'analyst', 'admin'];

export const DEAL_STAGE_VALUES: DealStage[] = [
  'pre-seed',
  'seed',
  'series-a',
  'series-b',
  'series-c',
  'series-d',
  'series-d+',
];

export const PIPELINE_STAGE_VALUES: PipelineStage[] = ['sourcing', 'screening', 'diligence', 'close'];

export const DEAL_STATUS_VALUES: DealStatus[] = ['active', 'closed', 'rejected', 'archived'];

export const SERVICE_TYPE_VALUES: ServiceType[] = [
  'due_diligence',
  'term_sheet_review',
  'financial_analysis',
  'market_research',
];

export const DOCUMENT_TYPE_VALUES: DocumentType[] = [
  'pitch_deck',
  'executive_summary',
  'financial_statement',
  'term_sheet',
  'other',
];

export const PORTFOLIO_HOLDING_STATUS_VALUES: PortfolioHoldingStatus[] = [
  'active',
  'exited',
  'written_off',
];
