import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerUser } from '@/lib/supabase-server'
import { extractTextFromPdf, extractTextFromDocx } from '@/lib/upload'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

const SYSTEM_PROMPT = `You are an expert startup attorney and venture capital advisor who specializes in analyzing term sheets for founders.

Analyze the provided term sheet clause by clause. For each clause:
1. Identify the clause name/type
2. Extract the relevant text from the term sheet
3. Rate it as "founder_friendly", "standard", or "needs_attention"
4. Explain what it means in plain English
5. Compare it to market standards

Return your analysis as valid JSON with this exact structure:
{
  "overall_rating": "founder_friendly" | "standard" | "needs_attention",
  "clauses": [
    {
      "name": "Clause Name",
      "rating": "founder_friendly" | "standard" | "needs_attention",
      "extracted_text": "The relevant text from the term sheet",
      "explanation": "What this means in plain English",
      "market_comparison": "How this compares to typical market terms"
    }
  ],
  "summary": "2-3 sentence overall summary",
  "stats": {
    "total_clauses": <number>,
    "founder_friendly": <number>,
    "standard": <number>,
    "needs_attention": <number>
  }
}

Be thorough — analyze every significant clause. Common clauses to look for include:
- Valuation / Price Per Share
- Investment Amount
- Liquidation Preference
- Anti-Dilution Protection
- Board Composition
- Voting Rights
- Protective Provisions
- Dividend Rights
- Participation Rights
- Drag-Along / Tag-Along
- Right of First Refusal (ROFR)
- Information Rights
- Vesting Schedule
- Founder Lock-up / No-Shop
- Representations and Warranties
- Closing Conditions
- Employee Option Pool

Only include clauses that are actually present in the document.`

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.docx') && !name.endsWith('.doc')) {
      return NextResponse.json(
        { error: 'Only PDF and DOCX files are supported' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File is too large. Maximum size is 25MB.' },
        { status: 400 }
      )
    }

    // Extract text
    const buffer = Buffer.from(await file.arrayBuffer())
    let text: string

    if (name.endsWith('.pdf')) {
      text = await extractTextFromPdf(buffer)
    } else {
      text = await extractTextFromDocx(buffer)
    }

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from the document. Please ensure it is a text-based file.' },
        { status: 400 }
      )
    }

    // Truncate if very long (keep within Claude context limits)
    const truncatedText = text.length > 100_000 ? text.slice(0, 100_000) + '\n\n[...truncated...]' : text

    // Call Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Please analyze this term sheet:\n\n${truncatedText}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response from Claude')
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse analysis from Claude')
    }

    const analysis = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      analysis,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })
  } catch (error) {
    console.error('[term-sheet/analyze] Error:', error)
    const message = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
