import { NextRequest, NextResponse } from 'next/server'
import { scoreStartup, extractTeaser } from '@/lib/anthropic'
import { extractTextFromBlobUrl } from '@/lib/upload'
import { createSubmission, updateSubmissionScore, isDatabaseConfigured } from '@/lib/db'
import { v4 as uuid } from 'uuid'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const submissionId = uuid()

  try {
    const body = await request.json()
    const {
      email,
      linkedinUrl,
      pitchDeckUrl,
      pitchDeckFilename,
      financialsUrl,
      financialsFilename,
      voiceNoteUrl,
    } = body as {
      email: string
      linkedinUrl: string
      pitchDeckUrl: string
      pitchDeckFilename: string
      financialsUrl: string
      financialsFilename: string
      voiceNoteUrl?: string
    }

    if (!email || !pitchDeckUrl || !financialsUrl || !linkedinUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: email, pitchDeckUrl, financialsUrl, linkedinUrl' },
        { status: 400 },
      )
    }

    // --- DB: save submission (best-effort, don't block scoring) ---
    if (isDatabaseConfigured()) {
      try {
        await createSubmission({
          id: submissionId,
          email,
          linkedin_url: linkedinUrl,
          pitch_deck_url: pitchDeckUrl,
          financials_url: financialsUrl,
          voice_note_url: voiceNoteUrl,
        })
      } catch (dbErr) {
        console.error('DB createSubmission failed (continuing):', dbErr)
      }
    }

    // --- Fetch files from Blob and extract text ---
    let pitchDeckText: string
    let financialsText: string
    try {
      ;[pitchDeckText, financialsText] = await Promise.all([
        extractTextFromBlobUrl(pitchDeckUrl, pitchDeckFilename || 'file.pdf'),
        extractTextFromBlobUrl(financialsUrl, financialsFilename || 'file.pdf'),
      ])
    } catch (fetchErr) {
      console.error('File fetch/extract error:', fetchErr)
      return NextResponse.json(
        { error: `Failed to read uploaded files: ${(fetchErr as Error).message}` },
        { status: 502 },
      )
    }

    // --- Validate extracted text ---
    if (!pitchDeckText || pitchDeckText.trim().length < 50) {
      console.error('Pitch deck text extraction yielded too little text:', pitchDeckText?.length || 0, 'chars')
      return NextResponse.json(
        { error: 'Could not extract enough text from your pitch deck. Please ensure the PDF contains selectable text (not scanned images).' },
        { status: 422 },
      )
    }
    if (!financialsText || financialsText.trim().length < 20) {
      console.error('Financials text extraction yielded too little text:', financialsText?.length || 0, 'chars')
      return NextResponse.json(
        { error: 'Could not extract enough data from your financials file. Please check the file format and try again.' },
        { status: 422 },
      )
    }

    console.log(`Extracted text: pitchDeck=${pitchDeckText.length} chars, financials=${financialsText.length} chars`)

    // --- Score with Claude ---
    let fullResult
    try {
      fullResult = await scoreStartup(pitchDeckText, financialsText, linkedinUrl)
    } catch (aiErr) {
      console.error('Claude API error:', aiErr)
      return NextResponse.json(
        { error: `AI scoring failed: ${(aiErr as Error).message}` },
        { status: 502 },
      )
    }

    // --- DB: save analysis (best-effort) ---
    if (isDatabaseConfigured()) {
      try {
        await updateSubmissionScore(submissionId, fullResult as unknown as Record<string, unknown>)
      } catch (dbErr) {
        console.error('DB updateSubmissionScore failed (continuing):', dbErr)
      }
    }

    const teaser = extractTeaser(fullResult)

    return NextResponse.json({
      submissionId,
      teaser,
    })
  } catch (error) {
    console.error('Scoring route unexpected error:', error)
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 },
    )
  }
}
