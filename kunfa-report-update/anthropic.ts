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
  return `You are a senior investment analyst at a top-tier venture capital firm. Generate a comprehensive Investment Memorandum based on the following scoring data.

## Scoring Data:
${JSON.stringify(scoringData, null, 2)}

## Instructions:
1. Use the scoring data above as the foundation, but EXPAND significantly beyond it.
2. Each dimension's detailed_analysis must be 5-8 substantive paragraphs (600-800 words total). Separate paragraphs with double newlines.
3. Each strength/risk/recommendation must have a detailed 2-3 sentence explanation in the "detail" field.
4. The executive_summary overview should be 3-4 paragraphs (~400 words). Separate paragraphs with double newlines.
5. The investment_thesis should be 2-3 paragraphs. Separate paragraphs with double newlines.
6. The key_findings should be 2-3 paragraphs. Separate paragraphs with double newlines.
7. Include 4-5 items for each strength/risk/recommendation array.
8. Include 5-6 items in risk_assessment with specific, actionable mitigations.
9. Include 5-6 items in strategic_recommendations covering immediate, short-term, and long-term priorities.
10. Include 4-6 items in fundraising_readiness.next_steps.
11. The executive summary should read like a professional PE/VC investment memo.
12. Include concrete, actionable insights grounded in the data.
13. Output ONLY valid JSON with no additional text, commentary, or markdown.

## Required JSON Structure:
{
  "executive_summary": {
    "overview": "3-4 paragraphs (~400 words) providing comprehensive company overview and investment opportunity",
    "investment_thesis": "2-3 paragraphs articulating the core investment thesis and value creation potential",
    "key_findings": "2-3 paragraphs highlighting the most critical findings across all dimensions"
  },
  "company_overview": {
    "description": "2-3 paragraphs describing the company, its mission, and what it does",
    "business_model": "1-2 paragraphs explaining the revenue model and unit economics",
    "target_market": "1-2 paragraphs describing the total addressable market and customer segments"
  },
  "dimensions": {
    "team": {
      "detailed_analysis": "5-8 detailed paragraphs (600-800 words) analyzing founder/team composition, experience, track record, execution capability, domain expertise, team gaps, and hiring plans",
      "strengths": [{ "point": "strength title", "detail": "2-3 sentence explanation" }],
      "risks": [{ "point": "risk title", "detail": "2-3 sentence explanation" }],
      "recommendations": [{ "point": "recommendation title", "detail": "2-3 sentence explanation" }]
    },
    "market": {
      "detailed_analysis": "5-8 detailed paragraphs (600-800 words) analyzing market size, growth dynamics, competitive landscape, timing, regulatory environment, and TAM expansion potential",
      "strengths": [{ "point": "strength title", "detail": "2-3 sentence explanation" }],
      "risks": [{ "point": "risk title", "detail": "2-3 sentence explanation" }],
      "recommendations": [{ "point": "recommendation title", "detail": "2-3 sentence explanation" }]
    },
    "product": {
      "detailed_analysis": "5-8 detailed paragraphs (600-800 words) analyzing product differentiation, technical architecture, IP/moat, product-market fit evidence, scalability, and user experience",
      "strengths": [{ "point": "strength title", "detail": "2-3 sentence explanation" }],
      "risks": [{ "point": "risk title", "detail": "2-3 sentence explanation" }],
      "recommendations": [{ "point": "recommendation title", "detail": "2-3 sentence explanation" }]
    },
    "financial": {
      "detailed_analysis": "5-8 detailed paragraphs (600-800 words) analyzing revenue model, unit economics, burn rate, runway, financial projections, capital efficiency, and path to profitability",
      "strengths": [{ "point": "strength title", "detail": "2-3 sentence explanation" }],
      "risks": [{ "point": "risk title", "detail": "2-3 sentence explanation" }],
      "recommendations": [{ "point": "recommendation title", "detail": "2-3 sentence explanation" }]
    }
  },
  "swot": {
    "strengths": ["4-5 major strengths"],
    "weaknesses": ["4-5 key weaknesses"],
    "opportunities": ["4-5 growth opportunities"],
    "threats": ["4-5 external threats"]
  },
  "risk_assessment": [
    { "risk": "risk description", "severity": "High|Medium|Low", "mitigation": "mitigation strategy" }
  ],
  "strategic_recommendations": [
    { "recommendation": "title", "priority": "Immediate|Short-term|Long-term", "detail": "detailed explanation" }
  ],
  "fundraising_readiness": {
    "current_status": "paragraph assessing readiness",
    "next_steps": ["concrete next steps"],
    "timeline": "paragraph with realistic timeline"
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
    max_tokens: 12000,
    system: `You are a senior investment analyst at a top-tier venture capital firm writing a comprehensive Investment Memorandum.

CRITICAL RULES:
- Your ENTIRE response must be a single valid JSON object.
- Do NOT include any text before or after the JSON.
- Do NOT wrap the JSON in markdown code fences or backticks.
- Do NOT include any explanation, commentary, or preamble.
- Start your response with { and end with }.
- All string values must be properly escaped for JSON.
- Use \\n\\n to separate paragraphs within text fields.
- Provide substantive, detailed analysis — each dimension analysis must be 600-800 words.
- Include 4-5 items for each strengths/risks/recommendations array.`,
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
