/**
 * Scoring engine for AI-powered deal evaluation
 * Orchestrates document retrieval, Claude scoring, and database updates
 */

import { ScoringDimensions, Deal, AIScoringLog } from './types';
import { scoreDeal } from './claude';
import { createServerSupabaseClient } from './supabase-server';

/**
 * Scoring weights for computing overall score from dimensions
 * Sum should equal 1.0
 */
export const SCORING_WEIGHTS = {
  team: 0.25,
  market: 0.2,
  traction: 0.2,
  product: 0.15,
  financials: 0.1,
  competitive_landscape: 0.1,
};

/**
 * Calculates overall score from individual dimension scores
 * Uses weighted average based on SCORING_WEIGHTS
 *
 * @param dimensions - Individual dimension scores (0-100)
 * @returns Weighted overall score (0-100)
 */
export function calculateOverallScore(dimensions: ScoringDimensions): number {
  const score =
    dimensions.team * SCORING_WEIGHTS.team +
    dimensions.market * SCORING_WEIGHTS.market +
    dimensions.traction * SCORING_WEIGHTS.traction +
    dimensions.product * SCORING_WEIGHTS.product +
    dimensions.financials * SCORING_WEIGHTS.financials +
    dimensions.competitive_landscape * SCORING_WEIGHTS.competitive_landscape;

  return Math.round(score);
}

/**
 * Scores a deal by:
 * 1. Fetching associated documents from Supabase
 * 2. Calling Claude API for analysis
 * 3. Updating deal record in database
 * 4. Logging the scoring operation
 *
 * @param dealId - ID of the deal to score
 * @param userId - ID of user triggering the score
 * @returns Updated deal with scoring results
 */
export async function scoreAndUpdateDeal(dealId: string, userId: string): Promise<Deal> {
  const startTime = Date.now();

  try {
    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Fetch the deal
    const { data: dealData, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !dealData) {
      throw new Error(`Failed to fetch deal: ${dealError?.message || 'Deal not found'}`);
    }

    const deal = dealData as Deal;

    // Fetch associated documents
    const { data: documentsData, error: docsError } = await supabase
      .from('deal_documents')
      .select('*')
      .eq('deal_id', dealId)
      .eq('parse_status', 'completed');

    if (docsError) {
      throw new Error(`Failed to fetch documents: ${docsError.message}`);
    }

    if (!documentsData || documentsData.length === 0) {
      throw new Error('No completed documents available for scoring');
    }

    // Combine extracted text from all documents
    const combinedText = documentsData
      .map((doc: any) => doc.extracted_text || '')
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!combinedText.trim()) {
      throw new Error('No extracted text available from documents');
    }

    // Call Claude API for scoring
    const scoringResponse = await scoreDeal(combinedText, deal.company_name);

    // Calculate overall score to verify it matches Claude's response
    const calculatedOverallScore = calculateOverallScore(scoringResponse.dimensions);

    // Update deal record with scoring results
    const { data: updatedDeal, error: updateError } = await supabase
      .from('deals')
      .update({
        overall_score: scoringResponse.overall_score,
        scoring_dimensions: scoringResponse.dimensions,
        ai_summary: scoringResponse.summary,
        red_flags: scoringResponse.red_flags,
        green_flags: scoringResponse.green_flags,
        scored_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select()
      .single();

    if (updateError || !updatedDeal) {
      throw new Error(`Failed to update deal: ${updateError?.message || 'Unknown error'}`);
    }

    // Log the scoring operation for audit trail
    const executionTime = Date.now() - startTime;
    await logScoringOperation(
      dealId,
      userId,
      documentsData.length,
      scoringResponse,
      executionTime,
      supabase,
    );

    return updatedDeal as Deal;
  } catch (error) {
    console.error('Error in scoreAndUpdateDeal:', error);
    throw error;
  }
}

/**
 * Logs a scoring operation for audit and analysis purposes
 *
 * @param dealId - ID of the deal scored
 * @param userId - ID of user who triggered scoring
 * @param documentsAnalyzed - Number of documents analyzed
 * @param scoringResponse - The scoring response from Claude
 * @param executionTimeMs - Time taken to execute scoring
 * @param supabase - Supabase client for database operations
 */
async function logScoringOperation(
  dealId: string,
  userId: string,
  documentsAnalyzed: number,
  scoringResponse: any,
  executionTimeMs: number,
  supabase: any,
): Promise<void> {
  try {
    // Estimate token usage (rough approximation)
    // Assuming ~100k tokens per hour = ~28 tokens per millisecond
    // Plus base 1000 tokens for request overhead
    const estimatedTokens = Math.round(executionTimeMs * 28 + 1000);
    const estimatedCost = estimatedTokens * 0.000003; // Claude Sonnet pricing ~$3/M tokens

    const { error } = await supabase.from('ai_scoring_logs').insert({
      deal_id: dealId,
      documents_analyzed: documentsAnalyzed,
      total_tokens_used: estimatedTokens,
      cost_estimate: estimatedCost,
      overall_score: scoringResponse.overall_score,
      dimensions: scoringResponse.dimensions,
      red_flags: scoringResponse.red_flags,
      green_flags: scoringResponse.green_flags,
      model_used: 'claude-sonnet-4-20250514',
      started_at: new Date(Date.now() - executionTimeMs).toISOString(),
      completed_at: new Date().toISOString(),
      execution_time_ms: executionTimeMs,
      created_by: userId,
    });

    if (error) {
      console.error('Error logging scoring operation:', error);
    }
  } catch (error) {
    console.error('Unexpected error logging scoring operation:', error);
  }
}

/**
 * Batch score multiple deals
 * Useful for initial setup or refreshing scores
 *
 * @param dealIds - Array of deal IDs to score
 * @param userId - ID of user triggering the batch score
 * @returns Array of updated deals
 */
export async function batchScoreDeals(dealIds: string[], userId: string): Promise<Deal[]> {
  const results: Deal[] = [];
  const errors: Array<{ dealId: string; error: Error }> = [];

  for (const dealId of dealIds) {
    try {
      const updatedDeal = await scoreAndUpdateDeal(dealId, userId);
      results.push(updatedDeal);
    } catch (error) {
      errors.push({
        dealId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  if (errors.length > 0) {
    console.warn('Batch scoring completed with errors:', errors);
  }

  return results;
}

/**
 * Validates scoring dimensions for consistency
 * Used as quality check on scoring results
 */
export function validateScoringDimensions(dimensions: ScoringDimensions): boolean {
  const requiredDimensions: (keyof ScoringDimensions)[] = [
    'team',
    'market',
    'traction',
    'product',
    'financials',
    'competitive_landscape',
  ];

  for (const dimension of requiredDimensions) {
    const value = dimensions[dimension];
    if (typeof value !== 'number' || value < 0 || value > 100) {
      console.error(`Invalid dimension ${dimension}: ${value}`);
      return false;
    }
  }

  return true;
}

/**
 * Gets the scoring status of a deal
 */
export async function getScoringStatus(dealId: string): Promise<{
  hasBestScore: boolean;
  lastScoredAt: string | null;
  overallScore: number | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('deals')
      .select('overall_score, scored_at')
      .eq('id', dealId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to fetch scoring status: ${error?.message || 'Deal not found'}`);
    }

    return {
      hasBestScore: data.overall_score !== null,
      lastScoredAt: data.scored_at,
      overallScore: data.overall_score,
    };
  } catch (error) {
    console.error('Error getting scoring status:', error);
    throw error;
  }
}

/**
 * Gets recent scoring logs for a deal
 */
export async function getRecentScoringLogs(dealId: string, limit: number = 10): Promise<any[]> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('ai_scoring_logs')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch scoring logs: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error getting scoring logs:', error);
    throw error;
  }
}
