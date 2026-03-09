/**
 * Global constants for Kunfa AI platform
 * Enums, lists, and configuration values used throughout the app
 */

import { DealStage, PipelineStage, UserRole, ServiceType } from './types';

/**
 * Canonical company stages (Title Case)
 * Used across scoring, onboarding, filters, and company pages.
 */
export const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'] as const;
export type Stage = (typeof STAGES)[number];

/**
 * Normalize any stage string to canonical Title Case.
 * E.g. "pre-seed" → "Pre-Seed", "SEED" → "Seed", "series a" → "Series A"
 */
export function normalizeStage(stage: string): string {
  const s = stage.toLowerCase().replace(/[-_]/g, ' ').trim();
  const map: Record<string, string> = {
    'pre seed': 'Pre-Seed',
    'preseed': 'Pre-Seed',
    'seed': 'Seed',
    'series a': 'Series A',
    'series b': 'Series B',
    'series c': 'Series C+',
    'series c+': 'Series C+',
    'series d': 'Series C+',
    'series d+': 'Series C+',
    'growth': 'Growth',
  };
  return map[s] || stage;
}

/**
 * Industry categories used across the platform
 */
export const INDUSTRIES = [
  'AI & Machine Learning',
  'B2B SaaS',
  'B2C',
  'Biotech & Life Sciences',
  'CleanTech & Energy',
  'Consumer Hardware',
  'Cybersecurity',
  'DevTools & Infrastructure',
  'E-commerce & Marketplace',
  'EdTech',
  'FinTech',
  'Food & Beverage',
  'Gaming',
  'HealthTech',
  'Logistics & Supply Chain',
  'Media & Entertainment',
  'PropTech & Real Estate',
  'Social',
  'Travel & Hospitality',
  'Web3 & Crypto',
  'Other',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

/**
 * Deal funding stages (legacy slug-based for deals table)
 * Progression from idea to large growth rounds
 */
export const DEAL_STAGES: Array<{ value: DealStage; label: string; description: string }> = [
  {
    value: 'pre-seed',
    label: 'Pre-Seed',
    description: 'Very early stage, idea or MVP phase',
  },
  {
    value: 'seed',
    label: 'Seed',
    description: 'Product-market fit exploration, early revenue',
  },
  {
    value: 'series-a',
    label: 'Series A',
    description: 'Early growth, proven product-market fit',
  },
  {
    value: 'series-b',
    label: 'Series B',
    description: 'Established growth trajectory',
  },
  {
    value: 'series-c',
    label: 'Series C',
    description: 'Scale phase, expanding to new markets',
  },
  {
    value: 'series-d',
    label: 'Series D',
    description: 'Late stage, preparing for exit or IPO',
  },
  {
    value: 'series-d+',
    label: 'Series D+',
    description: 'Very late stage or growth equity rounds',
  },
];

/**
 * Pipeline stages for deal management
 * Tracks movement through investment process
 */
export const PIPELINE_STAGES: Array<{
  value: PipelineStage;
  label: string;
  description: string;
  color: string;
}> = [
  {
    value: 'sourcing',
    label: 'Sourcing',
    description: 'Deal identified and added to pipeline',
    color: 'blue',
  },
  {
    value: 'screening',
    label: 'Screening',
    description: 'Initial review and due diligence',
    color: 'purple',
  },
  {
    value: 'diligence',
    label: 'Diligence',
    description: 'Deep technical and financial review',
    color: 'orange',
  },
  {
    value: 'close',
    label: 'Close',
    description: 'Final negotiation and commitment',
    color: 'green',
  },
];

/**
 * User roles in the platform
 */
export const USER_ROLES: Array<{ value: UserRole; label: string; description: string }> = [
  {
    value: 'founder',
    label: 'Founder',
    description: 'Startup founder seeking investment',
  },
  {
    value: 'investor',
    label: 'Investor',
    description: 'Fund manager or LP reviewing deals',
  },
  {
    value: 'scout',
    label: 'Scout',
    description: 'Deal sourcing and early screening',
  },
  {
    value: 'analyst',
    label: 'Analyst',
    description: 'Deep analysis and due diligence',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Platform administration and settings',
  },
];

/**
 * Service types offered through the platform
 */
export const SERVICE_TYPES: Array<{ value: ServiceType; label: string; description: string }> = [
  {
    value: 'due_diligence',
    label: 'Due Diligence',
    description: 'Comprehensive company and market research',
  },
  {
    value: 'term_sheet_review',
    label: 'Term Sheet Review',
    description: 'Legal and financial terms analysis',
  },
  {
    value: 'financial_analysis',
    label: 'Financial Analysis',
    description: 'Detailed financial modeling and projections',
  },
  {
    value: 'market_research',
    label: 'Market Research',
    description: 'Competitive landscape and TAM analysis',
  },
];

/**
 * Scoring dimensions with detailed information
 */
export const SCORING_DIMENSIONS: Array<{
  key: 'team' | 'market' | 'traction' | 'product' | 'financials' | 'competitive_landscape';
  label: string;
  description: string;
  weight: number;
  weightPercentage: number;
  evaluationFocus: string[];
}> = [
  {
    key: 'team',
    label: 'Team',
    description: 'Quality and experience of founders and leadership',
    weight: 0.25,
    weightPercentage: 25,
    evaluationFocus: [
      'Founder experience',
      'Track record of success',
      'Domain expertise',
      'Team composition',
      'Commitment signals',
    ],
  },
  {
    key: 'market',
    label: 'Market',
    description: 'Market size, growth, and accessibility',
    weight: 0.2,
    weightPercentage: 20,
    evaluationFocus: [
      'Total Addressable Market',
      'Market growth rate',
      'Market timing',
      'Competitive intensity',
      'Market accessibility',
    ],
  },
  {
    key: 'traction',
    label: 'Traction',
    description: 'Revenue growth, user metrics, and milestone achievement',
    weight: 0.2,
    weightPercentage: 20,
    evaluationFocus: [
      'Revenue growth',
      'User acquisition',
      'Key metrics',
      'Milestone achievement',
      'Runway sustainability',
    ],
  },
  {
    key: 'product',
    label: 'Product',
    description: 'Innovation, differentiation, and product-market fit',
    weight: 0.15,
    weightPercentage: 15,
    evaluationFocus: [
      'Product innovation',
      'Differentiation',
      'Technical feasibility',
      'User feedback',
      'Competitive advantages',
    ],
  },
  {
    key: 'financials',
    label: 'Financials',
    description: 'Unit economics, profitability path, and capital efficiency',
    weight: 0.1,
    weightPercentage: 10,
    evaluationFocus: [
      'Unit economics',
      'Profitability path',
      'Burn rate',
      'Use of funds',
      'Financial projections',
    ],
  },
  {
    key: 'competitive_landscape',
    label: 'Competitive Landscape',
    description: 'Competitive moat and long-term positioning',
    weight: 0.1,
    weightPercentage: 10,
    evaluationFocus: [
      'Competitive moat',
      'Barriers to entry',
      'Direct competition',
      'Indirect competition',
      'Defensibility',
    ],
  },
];

/**
 * Score ranges and their meanings
 */
export const SCORE_RANGES = [
  {
    min: 81,
    max: 100,
    label: 'Excellent',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    recommendation: 'Strong investment candidate - recommend proceeding',
  },
  {
    min: 61,
    max: 80,
    label: 'Good',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    recommendation: 'Solid opportunity - worth deeper diligence',
  },
  {
    min: 41,
    max: 60,
    label: 'Average',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-600',
    recommendation: 'Mixed signals - more information needed',
  },
  {
    min: 21,
    max: 40,
    label: 'Below Average',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    recommendation: 'Notable concerns - proceed with caution',
  },
  {
    min: 0,
    max: 20,
    label: 'Poor',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    recommendation: 'Significant risks - likely pass',
  },
];

/**
 * Document types that can be uploaded for deals
 */
export const DOCUMENT_TYPES = [
  { value: 'pitch_deck', label: 'Pitch Deck' },
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'financial_statement', label: 'Financial Statement' },
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  DEFAULT: 10 * 1024 * 1024, // 10 MB
  PDF: 50 * 1024 * 1024, // 50 MB
  DOCUMENT: 10 * 1024 * 1024, // 10 MB
  IMAGE: 5 * 1024 * 1024, // 5 MB
} as const;

/**
 * Supported file MIME types for upload
 */
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

/**
 * API rate limits
 */
export const RATE_LIMITS = {
  SCORE_DEAL: {
    requestsPerHour: 100,
    description: 'Score a single deal',
  },
  GENERATE_BRIEF: {
    requestsPerHour: 50,
    description: 'Generate company brief',
  },
  ANALYZE_TERM_SHEET: {
    requestsPerHour: 50,
    description: 'Analyze term sheet',
  },
} as const;

/**
 * Default scoring prompt instructions
 * Embedded in claude.ts but referenced here for documentation
 */
export const SCORING_INSTRUCTIONS = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  dimensions: 6,
  scaleMin: 0,
  scaleMax: 100,
  outputFormat: 'JSON',
  requiresValidation: true,
};

/**
 * Feature flags for platform capabilities
 */
export const FEATURE_FLAGS = {
  ENABLE_DOCUMENT_UPLOAD: true,
  ENABLE_AI_SCORING: true,
  ENABLE_BATCH_SCORING: true,
  ENABLE_COMPANY_BRIEF_GENERATION: true,
  ENABLE_TERM_SHEET_ANALYSIS: true,
  ENABLE_PORTFOLIO_TRACKING: true,
  ENABLE_ENGAGEMENT_TRACKING: true,
  ENABLE_SERVICE_REQUESTS: true,
  ENABLE_TEAM_COLLABORATION: true,
  ENABLE_API_ACCESS: false, // Coming soon
} as const;

/**
 * Platform configuration
 */
export const PLATFORM_CONFIG = {
  APP_NAME: 'Kunfa AI',
  VERSION: '0.1.0',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  MAX_CONCURRENT_SCORES: 5,
  DOCUMENT_EXTRACTION_TIMEOUT_MS: 30000,
  AI_SCORING_TIMEOUT_MS: 60000,
} as const;

/**
 * Helper function to get a score range
 */
export function getScoreRange(score: number) {
  return SCORE_RANGES.find((range) => score >= range.min && score <= range.max);
}

/**
 * Helper function to get a deal stage label
 */
export function getDealStageLabel(stage: DealStage): string {
  return DEAL_STAGES.find((s) => s.value === stage)?.label || stage;
}

/**
 * Helper function to get a pipeline stage label
 */
export function getPipelineStageLabel(stage: PipelineStage): string {
  return PIPELINE_STAGES.find((s) => s.value === stage)?.label || stage;
}

/**
 * Helper function to get a user role label
 */
export function getUserRoleLabel(role: UserRole): string {
  return USER_ROLES.find((r) => r.value === role)?.label || role;
}
