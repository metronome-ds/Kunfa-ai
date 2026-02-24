/**
 * Claude API client and helper functions for AI-powered deal analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import { ScoringResponse, CompanyBrief, TermSheetAnalysis, ScoringDimensions } from './types';

// Lazy initialization of Anthropic client
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing environment variable: ANTHROPIC_API_KEY');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const MODEL = 'claude-sonnet-4-20250514';

/**
 * Comprehensive scoring prompt for deal analysis
 * Evaluates deals across 6 weighted dimensions
 */
const SCORING_SYSTEM_PROMPT = `You are an expert venture capital analyst with deep experience evaluating startup investments.
Your task is to analyze provided deal documents and generate a comprehensive investment score.

Score each dimension on a scale of 0-100 where:
- 0-20: Poor - significant concerns, unlikely to recommend
- 21-40: Below Average - notable weaknesses
- 41-60: Average - balanced strengths and weaknesses
- 61-80: Good - strong fundamentals with minor concerns
- 81-100: Excellent - exceptional in this area, strong confidence

SCORING DIMENSIONS (Weights in overall score):

1. TEAM (25% weight)
   - Founder experience and track record
   - Team composition and complementary skills
   - Previous startup/business success
   - Domain expertise and depth
   - Team stability and commitment signals

2. MARKET (20% weight)
   - Market size (TAM - Total Addressable Market)
   - Market growth rate
   - Market timing and trends
   - Competitive intensity
   - Market accessibility for this team

3. TRACTION (20% weight)
   - Revenue and growth trajectory
   - User/customer acquisition and retention
   - Key milestones achieved
   - Product-market fit indicators
   - Runway and burn rate sustainability

4. PRODUCT (15% weight)
   - Product innovation and differentiation
   - Technical feasibility and risk
   - Product roadmap clarity
   - User/customer feedback and satisfaction
   - Competitive advantages

5. FINANCIALS (10% weight)
   - Unit economics and path to profitability
   - Funding ask rationale
   - Use of funds clarity
   - Financial projections reasonableness
   - Burn rate sustainability

6. COMPETITIVE LANDSCAPE (10% weight)
   - Competitive moat and defensibility
   - Barriers to entry
   - Direct and indirect competition analysis
   - Long-term competitive positioning
   - Unique value proposition

Return your analysis as valid JSON with NO additional text or formatting:
{
  "overall_score": <number 0-100>,
  "dimensions": {
    "team": <number 0-100>,
    "market": <number 0-100>,
    "traction": <number 0-100>,
    "product": <number 0-100>,
    "financials": <number 0-100>,
    "competitive_landscape": <number 0-100>
  },
  "summary": "<2-3 sentence executive summary of investment potential>",
  "red_flags": [<array of 3-5 specific concerns or risks>],
  "green_flags": [<array of 3-5 positive indicators or strengths>],
  "confidence_level": "<'high', 'medium', or 'low' based on document completeness>"
}`;

/**
 * Scores a deal based on provided document text
 * Performs comprehensive multi-dimensional analysis
 *
 * @param documentText - Full text content from deal documents
 * @param companyName - Name of the company being evaluated
 * @returns Structured scoring response with all dimensions and flags
 */
export async function scoreDeal(
  documentText: string,
  companyName: string = 'Unknown Company',
): Promise<ScoringResponse> {
  try {
    if (!documentText || documentText.trim().length === 0) {
      throw new Error('Document text is empty or invalid');
    }

    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SCORING_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Please analyze this deal for ${companyName}:\n\n${documentText}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    const responseText = content.text.trim();

    // Parse JSON response from Claude
    let scoringData: ScoringResponse;
    try {
      scoringData = JSON.parse(responseText);
    } catch (parseError) {
      // If JSON parsing fails, extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract valid JSON from Claude response');
      }
      scoringData = JSON.parse(jsonMatch[0]);
    }

    // Validate response structure
    validateScoringResponse(scoringData);

    return scoringData;
  } catch (error) {
    console.error('Error scoring deal:', error);
    throw error;
  }
}

/**
 * Generates a comprehensive company brief from deal documents
 *
 * @param documentText - Full text content from deal documents
 * @param companyName - Name of the company
 * @returns Company brief with mission, business model, team, and financial info
 */
export async function generateCompanyBrief(
  documentText: string,
  companyName: string = 'Unknown Company',
): Promise<Partial<CompanyBrief>> {
  try {
    if (!documentText || documentText.trim().length === 0) {
      throw new Error('Document text is empty or invalid');
    }

    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: `You are an expert business analyst. Create a comprehensive company brief from the provided documents.
Return a JSON object with the following structure (all fields required as strings):
{
  "tagline": "<1-sentence company description>",
  "mission": "<company mission statement>",
  "executive_summary": "<2-3 paragraph overview>",
  "target_market": "<description of target market>",
  "product_description": "<what the product/service does>",
  "business_model": "<how company makes money>",
  "go_to_market_strategy": "<GTM strategy overview>",
  "founding_team": "<names and brief bios of founders>",
  "key_experience": "<relevant experience of team members>",
  "key_metrics": "<important business metrics>",
  "recent_milestones": "<major achievements and timeline>",
  "revenue_model": "<revenue streams and pricing>",
  "unit_economics": "<unit economics if available>",
  "financial_highlights": "<key financial metrics and projections>"
}`,
      messages: [
        {
          role: 'user',
          content: `Create a company brief for ${companyName} based on:\n\n${documentText}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    const responseText = content.text.trim();

    // Parse JSON response
    let briefData: Partial<CompanyBrief>;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract valid JSON from Claude response');
      }
      briefData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing company brief response:', parseError);
      throw new Error('Failed to parse company brief from Claude response');
    }

    // Add company name
    briefData.company_name = companyName;

    return briefData;
  } catch (error) {
    console.error('Error generating company brief:', error);
    throw error;
  }
}

/**
 * Analyzes a term sheet document for key deal terms and risks
 *
 * @param documentText - Full text of the term sheet document
 * @param companyName - Name of the company
 * @returns Term sheet analysis with deal terms, risk assessment, and recommendations
 */
export async function analyzeTermSheet(
  documentText: string,
  companyName: string = 'Unknown Company',
): Promise<Partial<TermSheetAnalysis>> {
  try {
    if (!documentText || documentText.trim().length === 0) {
      throw new Error('Document text is empty or invalid');
    }

    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: `You are an expert venture capital attorney and investor. Analyze term sheets and provide comprehensive deal analysis.
Return a JSON object with the following structure:
{
  "investment_amount": <number or null>,
  "valuation": <number or null>,
  "equity_percentage": <number or null>,
  "liquidation_preference": "<type of liquidation preference>",
  "dilution_analysis": "<analysis of dilution from this round>",
  "anti_dilution_provisions": "<anti-dilution protection details>",
  "board_composition": "<composition and investor board seats>",
  "voting_rights": "<voting rights and veto provisions>",
  "favorable_terms": ["<list of favorable terms>"],
  "unfavorable_terms": ["<list of unfavorable or concerning terms>"],
  "negotiation_priorities": ["<key areas to negotiate or improve>"],
  "deal_quality_score": <number 0-100>,
  "key_insights": "<summary of deal quality and key insights>",
  "red_flags": ["<specific legal or financial red flags>"]
}`,
      messages: [
        {
          role: 'user',
          content: `Analyze this term sheet for ${companyName}:\n\n${documentText}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    const responseText = content.text.trim();

    // Parse JSON response
    let analysisData: Partial<TermSheetAnalysis>;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract valid JSON from Claude response');
      }
      analysisData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing term sheet analysis response:', parseError);
      throw new Error('Failed to parse term sheet analysis from Claude response');
    }

    return analysisData;
  } catch (error) {
    console.error('Error analyzing term sheet:', error);
    throw error;
  }
}

/**
 * Validates that a scoring response has the required structure
 */
function validateScoringResponse(response: unknown): asserts response is ScoringResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid scoring response: not an object');
  }

  const resp = response as Record<string, unknown>;

  // Check required fields
  if (typeof resp.overall_score !== 'number' || resp.overall_score < 0 || resp.overall_score > 100) {
    throw new Error('Invalid overall_score: must be a number between 0-100');
  }

  if (!resp.dimensions || typeof resp.dimensions !== 'object') {
    throw new Error('Invalid dimensions: must be an object');
  }

  const dims = resp.dimensions as Record<string, unknown>;
  const requiredDimensions = ['team', 'market', 'traction', 'product', 'financials', 'competitive_landscape'];

  for (const dim of requiredDimensions) {
    if (typeof dims[dim] !== 'number' || dims[dim] < 0 || dims[dim] > 100) {
      throw new Error(`Invalid dimension ${dim}: must be a number between 0-100`);
    }
  }

  if (typeof resp.summary !== 'string') {
    throw new Error('Invalid summary: must be a string');
  }

  if (!Array.isArray(resp.red_flags)) {
    throw new Error('Invalid red_flags: must be an array');
  }

  if (!Array.isArray(resp.green_flags)) {
    throw new Error('Invalid green_flags: must be an array');
  }

  if (!['high', 'medium', 'low'].includes(resp.confidence_level as string)) {
    throw new Error('Invalid confidence_level: must be high, medium, or low');
  }
}

/**
 * Extracts text from various document formats
 * Currently supports plain text; would extend to PDF, DOCX, etc.
 */
export async function extractDocumentText(
  fileContent: string,
  mimeType: string = 'text/plain',
): Promise<string> {
  // For plain text files, return as-is
  if (mimeType === 'text/plain') {
    return fileContent;
  }

  // For other formats, would implement extraction logic
  // This is a placeholder for future PDF/DOCX extraction
  console.warn(`Extraction for MIME type ${mimeType} not yet implemented`);
  return fileContent;
}
