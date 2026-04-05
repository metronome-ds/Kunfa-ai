import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface CompanyProfile {
  company_name: string
  industry: string
  stage: string
  team_size: number | null
  founded_year: number | null
  problem_summary: string
  solution_summary: string
  business_model: string
  traction: string
  use_of_funds: string
  key_risks: string
}

export interface ScoringResult {
  overall_score: number
  team_score: number
  team_grade: string
  team_summary: string
  market_score: number
  market_grade: string
  market_summary: string
  product_score: number
  product_grade: string
  product_summary: string
  traction_score: number
  traction_grade: string
  traction_summary: string
  financial_score: number
  financial_grade: string
  financial_summary: string
  fundraise_readiness_score: number
  fundraise_readiness_grade: string
  fundraise_readiness_summary: string
  description: string
  company_profile: CompanyProfile
  stage_weights_applied: string
  financials_analyzed: boolean
}

// Keep DimensionResult for expanded memo compatibility
export interface DimensionResult {
  score: number
  letter_grade: string
  headline: string
  analysis: string
  strengths: string[]
  risks: string[]
  recommendations: string[]
}

interface StageWeights {
  team: number
  market: number
  product: number
  traction: number
  financial: number
  fundraise_readiness: number
  label: string
}

function getStageWeights(stage: string): StageWeights {
  const s = (stage || '').toLowerCase().trim()
  if (
    s.includes('series b') ||
    s.includes('series c') ||
    s.includes('growth')
  ) {
    // Growth stage: traction + financials dominate
    return {
      team: 0.10, market: 0.15, product: 0.15,
      traction: 0.25, financial: 0.25, fundraise_readiness: 0.10,
      label: 'series_b_plus',
    }
  }
  if (s.includes('series a')) {
    return {
      team: 0.20, market: 0.20, product: 0.15,
      traction: 0.20, financial: 0.15, fundraise_readiness: 0.10,
      label: 'series_a',
    }
  }
  // Default: Pre-Seed / Seed / unknown — team + market matter most
  return {
    team: 0.30, market: 0.25, product: 0.20,
    traction: 0.05, financial: 0.10, fundraise_readiness: 0.10,
    label: 'pre_seed_seed',
  }
}

const SYSTEM_PROMPT = `You are Kunfa AI, a venture capital analysis engine that outputs ONLY valid JSON.

CRITICAL RULES:
- Your ENTIRE response must be a single valid JSON object.
- Do NOT include any text before or after the JSON.
- Do NOT wrap the JSON in markdown code fences or backticks.
- Do NOT include any explanation, commentary, or preamble.
- Start your response with { and end with }.
- All string values must be properly escaped for JSON.`

export interface ScoringDocument {
  category: string
  fileName: string
  text: string
}

function buildUserPrompt(
  pitchDeckText: string,
  financialsText: string,
  linkedinUrl: string,
  weights: StageWeights,
  hasFinancials: boolean,
  supplementaryDocs?: ScoringDocument[],
): string {
  const weightsPercent = {
    team: Math.round(weights.team * 100),
    market: Math.round(weights.market * 100),
    product: Math.round(weights.product * 100),
    traction: Math.round(weights.traction * 100),
    financial: Math.round(weights.financial * 100),
    fundraise_readiness: Math.round(weights.fundraise_readiness * 100),
  }

  // Build supplementary documents section
  let supplementarySection = ''
  if (supplementaryDocs && supplementaryDocs.length > 0) {
    supplementarySection = supplementaryDocs.map(doc => {
      const categoryLabel = doc.category.replace(/_/g, ' ').toUpperCase()
      return `\nSUPPLEMENTARY DOCUMENT — ${categoryLabel} (${doc.fileName}):\n${doc.text}\n`
    }).join('\n')
  }

  const financialsSection = hasFinancials
    ? `- Financial Data (separately provided):
${financialsText}

NOTE: The above financial data has been provided separately. Use this to give a more informed Financial Health & Traction score.`
    : supplementarySection
      ? '' // If we have supplementary docs, don't add the "no financials" note
      : `NOTE: No separate financial data was provided. Score Financial Health based solely on what's available in the pitch deck. Note this limitation in your analysis.`

  return `Analyze these startup materials and return a JSON investment scoring report.

## Documents Provided:

PRIMARY DOCUMENT — PITCH DECK:
${pitchDeckText || '[No pitch deck text could be extracted]'}

${financialsSection}
${supplementarySection}
- LinkedIn Profile: ${linkedinUrl || '[Not provided]'}

## Stage-Adjusted Scoring Weights (${weights.label}):
- Team & Founders: ${weightsPercent.team}%
- Market Opportunity: ${weightsPercent.market}%
- Product & Technology: ${weightsPercent.product}%
- Traction: ${weightsPercent.traction}%
- Financials: ${weightsPercent.financial}%
- Fundraise Readiness: ${weightsPercent.fundraise_readiness}%

## Scoring Rubric — score each category 0-25:

### Team & Founders (raw score 0-25):
- Founder background, domain expertise, relevant experience
- Complementary skill sets across co-founders
- Previous exits or notable company experience
- Advisory board strength and key hires
- Full-time commitment and skin in the game

### Market Opportunity (raw score 0-25):
- TAM/SAM/SOM sizing with supporting logic
- Market timing and tailwinds
- Competitive landscape awareness and differentiation
- Defensibility and moat potential
- Regulatory environment and barriers to entry

### Product & Technology (raw score 0-25):
- Problem clarity and severity
- Solution differentiation vs alternatives
- Current product stage (idea → MVP → live users → scaling)
- Technical architecture and IP considerations
- User feedback and validation signals

### Traction (raw score 0-25):
- Revenue or pre-revenue traction signals (paying customers, LOIs, pilots)
- Growth rate (MoM or YoY), user/engagement metrics
- Retention and cohort quality
- Key partnerships, distribution channels
- Evidence of product-market fit

### Financials (raw score 0-25):
- Unit economics (CAC, LTV, gross margin, payback period)
- Burn rate, runway, and capital efficiency
- Revenue model clarity and scalability
- Financial projections credibility
- Historical financial performance (if available)

### Fundraise Readiness (raw score 0-25):
- Clarity of use of funds and milestones tied to the raise
- Valuation reasonableness relative to stage and traction
- Data room completeness (pitch deck, financials, legal, team bios)
- Storytelling and narrative tightness
- Investor alignment and round structure

## Overall Score Calculation:
Compute the weighted overall score (0-100) using this formula:
overall_score = round(
  (team_raw/25 * ${weightsPercent.team}) +
  (market_raw/25 * ${weightsPercent.market}) +
  (product_raw/25 * ${weightsPercent.product}) +
  (traction_raw/25 * ${weightsPercent.traction}) +
  (financial_raw/25 * ${weightsPercent.financial}) +
  (fundraise_readiness_raw/25 * ${weightsPercent.fundraise_readiness})
)

## Grade Mapping (apply per category based on raw score 0-25):
23-25 = A+    20-22 = A-    18-19 = B+    16-17 = B
14-15 = B-    12-13 = C+    10-11 = C     8-9 = C-
6-7 = D       0-5 = F

## Required JSON structure (respond with ONLY this JSON, nothing else):
{
  "overall_score": 78,
  "team_score": 22,
  "team_grade": "A-",
  "team_summary": "One sentence summary of team assessment",
  "market_score": 20,
  "market_grade": "A-",
  "market_summary": "One sentence summary of market assessment",
  "product_score": 18,
  "product_grade": "B+",
  "product_summary": "One sentence summary of product assessment",
  "traction_score": 16,
  "traction_grade": "B",
  "traction_summary": "One sentence summary of traction assessment",
  "financial_score": 15,
  "financial_grade": "B-",
  "financial_summary": "One sentence summary of financial assessment",
  "fundraise_readiness_score": 17,
  "fundraise_readiness_grade": "B",
  "fundraise_readiness_summary": "One sentence summary of fundraise readiness assessment",
  "description": "2-3 sentence overall investment assessment",
  "company_profile": {
    "company_name": "the company name extracted from the pitch deck",
    "industry": "the sector or industry (e.g. FinTech, HealthTech, SaaS, E-commerce)",
    "stage": "Pre-Seed, Seed, Series A, Series B, or Growth",
    "team_size": 5,
    "founded_year": 2023,
    "problem_summary": "1-2 sentence description of the problem being solved",
    "solution_summary": "1-2 sentence description of the solution/product",
    "business_model": "1-2 sentence description of the revenue/business model",
    "traction": "1-2 sentence summary of traction and key metrics",
    "use_of_funds": "1-2 sentence description of how the raise will be used",
    "key_risks": "1-2 sentence summary of the top investment risks"
  },
  "stage_weights_applied": "${weights.label}",
  "financials_analyzed": ${hasFinancials}
}

IMPORTANT:
- The overall_score MUST be computed using the stage-adjusted weights shown above, NOT by simply summing the raw scores.
- Each raw score must be between 0 and 25.
- Assign grades strictly according to the grade mapping above.
- Be rigorous and calibrated — most startups should score 50-75 overall. Only exceptional companies score above 85.`
}

/**
 * Try to extract valid JSON from a string that may contain surrounding text.
 * Attempts: direct parse → strip code fences → regex extract outer braces.
 */
function extractJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()

  // Attempt 1: direct parse
  try {
    return JSON.parse(trimmed)
  } catch {
    // continue
  }

  // Attempt 2: strip markdown code fences
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim()
  try {
    return JSON.parse(fenceStripped)
  } catch {
    // continue
  }

  // Attempt 3: find the first { and last } — extract the JSON object
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = raw.slice(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(candidate)
    } catch {
      // continue
    }
  }

  throw new Error(`Could not extract JSON from AI response (first 200 chars): ${trimmed.slice(0, 200)}`)
}

async function callClaude(
  pitchDeckText: string,
  financialsText: string,
  linkedinUrl: string,
  weights: StageWeights,
  hasFinancials: boolean,
  supplementaryDocs?: ScoringDocument[],
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(pitchDeckText, financialsText, linkedinUrl, weights, hasFinancials, supplementaryDocs),
      },
    ],
  })

  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude API')
  }

  return textContent.text
}

export async function scoreStartup(
  pitchDeckText: string,
  financialsText: string,
  linkedinUrl: string,
  companyStage: string,
  supplementaryDocs?: ScoringDocument[],
): Promise<ScoringResult> {
  const weights = getStageWeights(companyStage)
  const hasFinancials = !!financialsText && financialsText.trim().length > 0

  // --- Attempt 1 ---
  let rawResponse: string
  try {
    rawResponse = await callClaude(pitchDeckText, financialsText, linkedinUrl, weights, hasFinancials, supplementaryDocs)
  } catch (apiErr) {
    console.error('Claude API call failed:', apiErr)
    throw new Error(`Claude API call failed: ${(apiErr as Error).message}`)
  }

  try {
    const parsed = extractJson(rawResponse)
    return parsed as unknown as ScoringResult
  } catch (parseErr) {
    console.error('Attempt 1 parse failed. Raw response (first 500 chars):', rawResponse.slice(0, 500))
  }

  // --- Attempt 2: retry with an even more explicit prompt ---
  console.log('Retrying with simplified prompt...')
  try {
    const retryMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: 'You are a JSON-only API. Respond with ONLY a valid JSON object. No other text.',
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(pitchDeckText, financialsText, linkedinUrl, weights, hasFinancials, supplementaryDocs),
        },
        {
          role: 'assistant',
          content: '{',
        },
      ],
    })

    const retryText = retryMessage.content.find((c) => c.type === 'text')
    if (!retryText || retryText.type !== 'text') {
      throw new Error('No text in retry response')
    }

    // Prepend the "{" we prefilled
    const retryRaw = '{' + retryText.text
    const parsed = extractJson(retryRaw)
    return parsed as unknown as ScoringResult
  } catch (retryErr) {
    console.error('Attempt 2 also failed:', retryErr)
    throw new Error(
      `AI scoring failed after 2 attempts. The AI did not return valid JSON. ` +
      `First response started with: "${rawResponse.slice(0, 100)}..."`,
    )
  }
}

/**
 * Extract a teaser from a ScoringResult for quick display.
 * Maps from the flat format to the nested teaser format the UI expects.
 */
export function extractTeaser(result: ScoringResult) {
  const score = result.overall_score || 0

  // Determine investment readiness from overall score
  let investmentReadiness = 'Early Stage'
  if (score >= 80) investmentReadiness = 'Strong'
  else if (score >= 65) investmentReadiness = 'Almost Ready'
  else if (score >= 50) investmentReadiness = 'Needs Work'

  return {
    overall_score: score,
    percentile: Math.min(99, Math.max(1, score)),
    summary: result.description || '',
    investment_readiness: investmentReadiness,
    dimensions: {
      team: {
        score: result.team_score || 0,
        letter_grade: result.team_grade || 'N/A',
        headline: result.team_summary || '',
      },
      market: {
        score: result.market_score || 0,
        letter_grade: result.market_grade || 'N/A',
        headline: result.market_summary || '',
      },
      product: {
        score: result.product_score || 0,
        letter_grade: result.product_grade || 'N/A',
        headline: result.product_summary || '',
      },
      traction: {
        score: result.traction_score || 0,
        letter_grade: result.traction_grade || 'N/A',
        headline: result.traction_summary || '',
      },
      financial: {
        score: result.financial_score || 0,
        letter_grade: result.financial_grade || 'N/A',
        headline: result.financial_summary || '',
      },
      fundraise_readiness: {
        score: result.fundraise_readiness_score || 0,
        letter_grade: result.fundraise_readiness_grade || 'N/A',
        headline: result.fundraise_readiness_summary || '',
      },
    },
  }
}

// --- Expanded Investment Memo Generation ---

export interface ExpandedDimension {
  detailed_analysis: string
  strengths: Array<{ point: string; detail: string }>
  risks: Array<{ point: string; detail: string }>
  recommendations: Array<{ point: string; detail: string }>
}

export interface ExpandedMemoContent {
  executive_summary: {
    overview: string
    investment_thesis: string
    key_findings: string
  }
  company_overview: {
    description: string
    business_model: string
    target_market: string
  }
  dimensions: {
    team: ExpandedDimension
    market: ExpandedDimension
    product: ExpandedDimension
    financial: ExpandedDimension
  }
  swot: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  risk_assessment: Array<{
    risk: string
    severity: string
    mitigation: string
  }>
  strategic_recommendations: Array<{
    recommendation: string
    priority: string
    detail: string
  }>
  fundraising_readiness: {
    current_status: string
    next_steps: string[]
    timeline: string
  }
}

function buildExpandedMemoPrompt(scoringData: ScoringResult): string {
  return `You are a senior investment analyst. Generate a concise Investment Memorandum based on the following scoring data.

## Scoring Data:
${JSON.stringify(scoringData, null, 2)}

## Instructions:
1. Use the scoring data as the foundation and expand with professional analysis.
2. Each dimension's detailed_analysis should be 1-2 paragraphs (150-200 words). Separate paragraphs with double newlines.
3. Each strength/risk/recommendation needs a "point" (title) and "detail" (1 sentence explanation).
4. The executive_summary overview should be 1 paragraph (~100 words).
5. The investment_thesis should be 1 paragraph (~80 words).
6. The key_findings should be 1 paragraph (~80 words).
7. Include exactly 3 items for each strengths/risks/recommendations array per dimension.
8. Include exactly 3 items in SWOT arrays.
9. Include exactly 3 items in risk_assessment.
10. Include exactly 3 items in strategic_recommendations.
11. Include exactly 3 items in fundraising_readiness.next_steps.
12. Keep all text concise and professional.
13. Output ONLY valid JSON with no additional text.

## Required JSON Structure:
{
  "executive_summary": {
    "overview": "1 paragraph (~100 words) company overview and investment opportunity",
    "investment_thesis": "1 paragraph (~80 words) core investment thesis",
    "key_findings": "1 paragraph (~80 words) critical findings"
  },
  "company_overview": {
    "description": "1 paragraph describing the company and its mission",
    "business_model": "1 paragraph on revenue model",
    "target_market": "1 paragraph on TAM and customers"
  },
  "dimensions": {
    "team": {
      "detailed_analysis": "1-2 paragraphs (150-200 words) on team quality",
      "strengths": [{ "point": "title", "detail": "1 sentence" }],
      "risks": [{ "point": "title", "detail": "1 sentence" }],
      "recommendations": [{ "point": "title", "detail": "1 sentence" }]
    },
    "market": {
      "detailed_analysis": "1-2 paragraphs (150-200 words) on market opportunity",
      "strengths": [{ "point": "title", "detail": "1 sentence" }],
      "risks": [{ "point": "title", "detail": "1 sentence" }],
      "recommendations": [{ "point": "title", "detail": "1 sentence" }]
    },
    "product": {
      "detailed_analysis": "1-2 paragraphs (150-200 words) on product differentiation",
      "strengths": [{ "point": "title", "detail": "1 sentence" }],
      "risks": [{ "point": "title", "detail": "1 sentence" }],
      "recommendations": [{ "point": "title", "detail": "1 sentence" }]
    },
    "financial": {
      "detailed_analysis": "1-2 paragraphs (150-200 words) on financial health",
      "strengths": [{ "point": "title", "detail": "1 sentence" }],
      "risks": [{ "point": "title", "detail": "1 sentence" }],
      "recommendations": [{ "point": "title", "detail": "1 sentence" }]
    }
  },
  "swot": {
    "strengths": ["3 strengths"],
    "weaknesses": ["3 weaknesses"],
    "opportunities": ["3 opportunities"],
    "threats": ["3 threats"]
  },
  "risk_assessment": [
    { "risk": "description", "severity": "High|Medium|Low", "mitigation": "strategy" }
  ],
  "strategic_recommendations": [
    { "recommendation": "title", "priority": "Immediate|Short-term|Long-term", "detail": "explanation" }
  ],
  "fundraising_readiness": {
    "current_status": "1 paragraph assessing readiness",
    "next_steps": ["3 concrete next steps"],
    "timeline": "1 sentence timeline"
  }
}

Respond with ONLY the JSON object. Start with { and end with }.`
}

export async function generateExpandedMemo(
  scoringData: ScoringResult,
): Promise<ExpandedMemoContent> {
  const userPrompt = buildExpandedMemoPrompt(scoringData)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: `You are a senior investment analyst writing a concise Investment Memorandum.

CRITICAL RULES:
- Your ENTIRE response must be a single valid JSON object.
- Do NOT include any text before or after the JSON.
- Do NOT wrap the JSON in markdown code fences or backticks.
- Do NOT include any explanation, commentary, or preamble.
- Start your response with { and end with }.
- All string values must be properly escaped for JSON.
- Keep analysis concise: 150-200 words per dimension, ~100 words for summaries.
- Include exactly 3 items for each array field.`,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude API for expanded memo generation')
  }

  try {
    const parsed = extractJson(textContent.text)
    return parsed as unknown as ExpandedMemoContent
  } catch (parseErr) {
    console.error(
      'Failed to parse expanded memo response. Raw response (first 500 chars):',
      textContent.text.slice(0, 500),
    )
    throw new Error(
      `Failed to generate expanded memo: ${(parseErr as Error).message}`,
    )
  }
}
