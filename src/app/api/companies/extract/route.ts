import { getServerUser } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pdfUrl } = body

    if (!pdfUrl) {
      return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 })
    }

    // Fetch PDF content
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 502 })
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    // Extract details with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: `Extract the following details from this pitch deck or company document. Return ONLY valid JSON with these fields:
{
  "company_name": "string",
  "sector": "string (e.g. FinTech, HealthTech, SaaS, AI/ML, etc.)",
  "stage": "string (e.g. Pre-seed, Seed, Series A, Series B, etc.)",
  "raise_amount": number or null (in USD, no currency symbols),
  "description": "string (1-2 sentence company description)",
  "team_size": number or null,
  "founded_year": number or null
}

If a field cannot be determined, use null. Return ONLY the JSON object, no markdown or explanation.`,
            },
          ],
        },
      ],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 502 })
    }

    // Parse the JSON response
    let extracted
    try {
      // Strip any markdown code fences if present
      const cleaned = textContent.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      extracted = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse AI response:', textContent.text)
      return NextResponse.json({ error: 'Failed to parse extracted data' }, { status: 502 })
    }

    return NextResponse.json(extracted)
  } catch (error) {
    console.error('Companies extract error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
