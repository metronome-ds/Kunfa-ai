import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface ScoringResult {
  overall_score: number
  percentile: number
  summary: string
  dimensions: {
    team: DimensionResult
    market: DimensionResult
    product: DimensionResult
    financial: DimensionResult
  }
  sector_benchmarks: {
    sector: string
    avg_score: number
    comparison: string
  }
  deck_recommendations: string[]
  overall_recommendations: string[]
  investment_readiness: string
}

export interface DimensionResult {
  score: number
  letter_grade: string
  headline: string
  analysis: string
  strengths: string[]
  risks: string[]
  recommendations: string[]
}

const SYSTEM_PROMPT = `You are Kunfa AI, a venture capital analysis engine that outputs ONLY valid JSON.

CRITICAL RULES:
- Your ENTIRE response must be a single valid JSON object.
- Do NOT include any text before or after the JSON.
- Do NOT wrap the JSON in markdown code fences or backticks.
- Do NOT include any explanation, commentary, or preamble.
- Start your response with { and end with }.
- All string values must be properly escaped for JSON.`

function buildUserPrompt(
  pitchDeckText: string,
  financialsText: string,
  linkedinUrl: string,
): string {
  return `Analyze these startup materials and return a JSON investment memo.

## Documents Provided:
- Pitch Deck Content:
${pitchDeckText || '[No pitch deck text could be extracted]'}

- Financials Content:
${financialsText || '[No financials text could be extracted]'}

- LinkedIn Profile: ${linkedinUrl}

## Score across 4 dimensions (each 0-25, totaling 0-100):
1. Team & Founders (0-25): founder experience, team completeness, domain expertise, track record
2. Market Opportunity & TAM (0-25): market size, growth rate, timing, competitive landscape
3. Product/Tech Differentiation (0-25): uniqueness, IP/moat, PMF evidence, scalability
4. Financial Health & Projections (0-25): revenue model, unit economics, burn rate, runway

## Required JSON structure (respond with ONLY this JSON, nothing else):
{
  "overall_score": 0,
  "percentile": 0,
  "summary": "2-3 sentence executive summary",
  "dimensions": {
    "team": {
      "score": 0,
      "letter_grade": "B+",
      "headline": "one line summary",
      "analysis": "3-5 paragraph detailed analysis",
      "strengths": ["strength1", "strength2"],
      "risks": ["risk1", "risk2"],
      "recommendations": ["rec1", "rec2"]
    },
    "market": {
      "score": 0,
      "letter_grade": "B",
      "headline": "one line",
      "analysis": "detailed",
      "strengths": ["s1"],
      "risks": ["r1"],
      "recommendations": ["r1"]
    },
    "product": {
      "score": 0,
      "letter_grade": "B",
      "headline": "one line",
      "analysis": "detailed",
      "strengths": ["s1"],
      "risks": ["r1"],
      "recommendations": ["r1"]
    },
    "financial": {
      "score": 0,
      "letter_grade": "B-",
      "headline": "one line",
      "analysis": "detailed",
      "strengths": ["s1"],
      "risks": ["r1"],
      "recommendations": ["r1"]
    }
  },
  "sector_benchmarks": {
    "sector": "identified sector",
    "avg_score": 65,
    "comparison": "comparison text"
  },
  "deck_recommendations": ["improvement 1", "improvement 2"],
  "overall_recommendations": ["strategic rec 1", "strategic rec 2"],
  "investment_readiness": "Almost Ready"
}`
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
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(pitchDeckText, financialsText, linkedinUrl),
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
): Promise<ScoringResult> {
  // --- Attempt 1 ---
  let rawResponse: string
  try {
    rawResponse = await callClaude(pitchDeckText, financialsText, linkedinUrl)
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
          content: buildUserPrompt(pitchDeckText, financialsText, linkedinUrl),
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

export function extractTeaser(result: ScoringResult) {
  return {
    overall_score: result.overall_score,
    percentile: result.percentile,
    summary: result.summary,
    investment_readiness: result.investment_readiness,
    dimensions: {
      team: {
        score: result.dimensions.team.score,
        letter_grade: result.dimensions.team.letter_grade,
        headline: result.dimensions.team.headline,
      },
      market: {
        score: result.dimensions.market.score,
        letter_grade: result.dimensions.market.letter_grade,
        headline: result.dimensions.market.headline,
      },
      product: {
        score: result.dimensions.product.score,
        letter_grade: result.dimensions.product.letter_grade,
        headline: result.dimensions.product.headline,
      },
      financial: {
        score: result.dimensions.financial.score,
        letter_grade: result.dimensions.financial.letter_grade,
        headline: result.dimensions.financial.headline,
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
