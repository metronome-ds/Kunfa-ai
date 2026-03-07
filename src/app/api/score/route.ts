import { NextRequest, NextResponse } from 'next/server'
import { scoreStartup, extractTeaser } from '@/lib/anthropic'
import { extractTextFromBlobUrl } from '@/lib/upload'
import {
  createSubmission,
  updateSubmissionScore,
  isDatabaseConfigured,
  findOrCreateUser,
  userHasSubmission,
  createCompanyPage,
  getProfileByUserId,
} from '@/lib/db'
import { getSupabase } from '@/lib/db'
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
      slug: userSlug,
    } = body as {
      email: string
      linkedinUrl: string
      pitchDeckUrl: string
      pitchDeckFilename: string
      financialsUrl: string
      financialsFilename: string
      voiceNoteUrl?: string
      slug?: string
    }

    if (!email || !pitchDeckUrl || !financialsUrl || !linkedinUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: email, pitchDeckUrl, financialsUrl, linkedinUrl' },
        { status: 400 },
      )
    }

    // --- Find or create user account ---
    let userId: string | null = null
    if (isDatabaseConfigured()) {
      try {
        userId = await findOrCreateUser(email)

        // Check if user already has a submission (one per account)
        const hasExisting = await userHasSubmission(userId)
        if (hasExisting) {
          return NextResponse.json(
            { error: 'You already have a submission. Each account is limited to one submission. Use a different email to score another business.' },
            { status: 409 },
          )
        }
      } catch (userErr) {
        console.error('User creation failed (continuing without user link):', userErr)
      }
    }

    // --- DB: save submission ---
    if (isDatabaseConfigured() && userId) {
      try {
        await createSubmission({
          id: submissionId,
          user_id: userId,
          email,
          linkedin_url: linkedinUrl,
          pitch_deck_url: pitchDeckUrl,
          pitch_deck_filename: pitchDeckFilename,
          financials_url: financialsUrl,
          financials_filename: financialsFilename,
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

    // --- DB: save analysis ---
    let slug: string | undefined
    if (isDatabaseConfigured()) {
      try {
        await updateSubmissionScore(submissionId, fullResult as unknown as Record<string, unknown>)

        // Create company page with AI-extracted profile + user profile data
        if (userId) {
          const cp = (fullResult as any)?.company_profile || {}
          let profile: Awaited<ReturnType<typeof getProfileByUserId>> = null
          try {
            profile = await getProfileByUserId(userId)
          } catch { /* continue without profile data */ }

          const companyName = profile?.company_name ||
            cp.company_name ||
            email.split('@')[1]?.split('.')[0] ||
            'Unnamed Company'

          // User's industry choice (from onboarding) takes precedence over AI extraction
          const industry = profile?.industry || cp.industry || (fullResult as any)?.sector_benchmarks?.sector || undefined

          const result = await createCompanyPage({
            userId,
            submissionId,
            companyName,
            overallScore: (fullResult as any)?.overall_score || 0,
            slug: userSlug || undefined,
            description: (fullResult as any)?.summary || undefined,
            oneLiner: profile?.one_liner || undefined,
            industry,
            stage: profile?.company_stage || cp.stage || undefined,
            raiseAmount: cp.raise_amount || undefined,
            teamSize: profile?.team_size || cp.team_size || undefined,
            foundedYear: cp.founded_year || undefined,
            problemSummary: cp.problem_summary || undefined,
            solutionSummary: cp.solution_summary || undefined,
            businessModel: cp.business_model || undefined,
            traction: cp.traction || undefined,
            useOfFunds: cp.use_of_funds || undefined,
            keyRisks: cp.key_risks || undefined,
            country: profile?.company_country || undefined,
            headquarters: profile?.company_country || undefined,
            websiteUrl: profile?.company_website || undefined,
            founderName: profile?.full_name || undefined,
            founderTitle: profile?.job_title || undefined,
            linkedinUrl: profile?.linkedin_url || linkedinUrl || undefined,
            source: 'startup_submission',
          })
          slug = result.slug

          // Auto-create deals record so company appears in Browse Deals
          if (result.id) {
            try {
              const supabase = getSupabase()
              await supabase.from('deals').insert({
                created_by: userId,
                company_id: result.id,
                stage: 'sourced',
                ai_score: (fullResult as any)?.overall_score || null,
                sector: industry || null,
                raise_amount: cp.raise_amount || null,
              })
            } catch (dealErr) {
              console.error('Failed to create deals record (continuing):', dealErr)
            }
          }
        }
      } catch (dbErr) {
        console.error('DB updateSubmissionScore failed (continuing):', dbErr)
      }
    }

    const teaser = extractTeaser(fullResult)

    return NextResponse.json({
      submissionId,
      teaser,
      slug,
    })
  } catch (error) {
    console.error('Scoring route unexpected error:', error)
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 },
    )
  }
}
