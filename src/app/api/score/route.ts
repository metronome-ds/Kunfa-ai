import { NextRequest, NextResponse } from 'next/server'
import { scoreStartup, extractTeaser, ScoringDocument, ScoringTooLargeError } from '@/lib/anthropic'
import { extractTextFromBlobUrl } from '@/lib/upload'
import {
  createSubmission,
  updateSubmissionScore,
  isDatabaseConfigured,
  findOrCreateUser,
  userHasSubmission,
  createCompanyPage,
  updateCompanyPageScore,
  getProfileByUserId,
} from '@/lib/db'
import { getSupabase } from '@/lib/db'
import { v4 as uuid } from 'uuid'
import { normalizeStage } from '@/lib/constants'

export const maxDuration = 120

// --- IP-based rate limiting (in-memory, resets on cold start) ---
const ipRateMap = new Map<string, { count: number; windowStart: number }>()
const IP_LIMIT = 10
const IP_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipRateMap.get(ip)
  if (!entry || now - entry.windowStart > IP_WINDOW_MS) {
    ipRateMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= IP_LIMIT) return false
  entry.count++
  return true
}

// --- User-based rate limiting via submissions table ---
async function checkUserRateLimit(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabase()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo)
    return (count ?? 0) < 3
  } catch {
    return true // allow on error
  }
}

export async function POST(request: NextRequest) {
  const submissionId = uuid()

  try {
    // --- IP rate limit check ---
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkIpRateLimit(ip)) {
      return NextResponse.json(
        { error: "You've reached the scoring limit. Please try again in an hour." },
        { status: 429 },
      )
    }

    const body = await request.json()
    const {
      email,
      linkedinUrl,
      companyLinkedinUrl,
      pitchDeckUrl,
      pitchDeckFilename,
      financialsUrl,
      financialsFilename,
      slug: userSlug,
      companyPageId,
      foundingTeam,
      documentIds,
    } = body as {
      email: string
      linkedinUrl?: string
      companyLinkedinUrl?: string
      pitchDeckUrl: string
      pitchDeckFilename: string
      financialsUrl?: string
      financialsFilename?: string
      slug?: string
      companyPageId?: string
      foundingTeam?: { name: string; title: string; email?: string; linkedin?: string }[]
      documentIds?: string[]
    }

    // documentIds mode: re-score using deal room documents (requires companyPageId)
    const isDealRoomRescore = documentIds && documentIds.length > 0 && companyPageId

    if (!email || (!pitchDeckUrl && !isDealRoomRescore)) {
      return NextResponse.json(
        { error: 'Missing required fields: email, pitchDeckUrl (or documentIds for re-scoring)' },
        { status: 400 },
      )
    }

    // --- Find or create user account ---
    let userId: string | null = null
    if (isDatabaseConfigured()) {
      try {
        userId = await findOrCreateUser(email)

        // --- User rate limit check (3 per hour) ---
        const withinLimit = await checkUserRateLimit(userId)
        if (!withinLimit) {
          return NextResponse.json(
            { error: "You've reached the scoring limit. Please try again in an hour." },
            { status: 429 },
          )
        }

        // Check if user already has a submission (one per account, unless re-scoring)
        if (!companyPageId) {
          const hasExisting = await userHasSubmission(userId)
          if (hasExisting) {
            return NextResponse.json(
              { error: 'You already have a submission. Each account is limited to one submission. Use a different email to score another business.' },
              { status: 409 },
            )
          }
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
          linkedin_url: linkedinUrl || null,
          pitch_deck_url: pitchDeckUrl,
          pitch_deck_filename: pitchDeckFilename,
          financials_url: financialsUrl || null,
          financials_filename: financialsFilename || null,
        })
      } catch (dbErr) {
        console.error('DB createSubmission failed (continuing):', dbErr)
      }
    }

    // --- Fetch files and extract text ---
    let pitchDeckText = ''
    let financialsText = ''
    let supplementaryDocs: ScoringDocument[] = []
    let scoredDocuments: { id: string; file_name: string; category: string }[] = []

    if (isDealRoomRescore) {
      // --- Deal room re-score: fetch documents by IDs ---
      try {
        const supabase = getSupabase()
        const { data: docs, error: docsErr } = await supabase
          .from('dealroom_documents')
          .select('id, file_name, file_url, category')
          .in('id', documentIds!)
          .eq('company_id', companyPageId!)

        if (docsErr || !docs || docs.length === 0) {
          return NextResponse.json(
            { error: 'Could not find the selected documents.' },
            { status: 404 },
          )
        }

        // Extract text from each document
        for (const doc of docs) {
          try {
            const text = await extractTextFromBlobUrl(doc.file_url, doc.file_name)

            if (doc.category === 'pitch_deck') {
              // Use the most recent pitch deck as primary
              pitchDeckText = text
            } else if (doc.category === 'financials') {
              financialsText = text
            } else {
              supplementaryDocs.push({
                category: doc.category,
                fileName: doc.file_name,
                text,
              })
            }

            scoredDocuments.push({
              id: doc.id,
              file_name: doc.file_name,
              category: doc.category,
            })
          } catch (extractErr) {
            console.error(`Failed to extract text from ${doc.file_name}:`, extractErr)
            // Continue with other documents — don't fail the whole scoring
          }
        }

        // If no pitch deck found among selected docs, use the latest pitch_deck from the deal room
        if (!pitchDeckText) {
          const { data: latestPitch } = await supabase
            .from('dealroom_documents')
            .select('id, file_name, file_url')
            .eq('company_id', companyPageId!)
            .eq('category', 'pitch_deck')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (latestPitch) {
            try {
              pitchDeckText = await extractTextFromBlobUrl(latestPitch.file_url, latestPitch.file_name)
              // Add to scored documents list if not already there
              if (!scoredDocuments.find(d => d.id === latestPitch.id)) {
                scoredDocuments.push({
                  id: latestPitch.id,
                  file_name: latestPitch.file_name,
                  category: 'pitch_deck',
                })
              }
            } catch { /* continue without pitch deck */ }
          }
        }
      } catch (fetchErr) {
        console.error('Deal room document fetch error:', fetchErr)
        return NextResponse.json(
          { error: `Failed to read deal room documents: ${(fetchErr as Error).message}` },
          { status: 502 },
        )
      }
    } else {
      // --- Original flow: direct file URLs ---
      try {
        pitchDeckText = await extractTextFromBlobUrl(pitchDeckUrl, pitchDeckFilename || 'file.pdf')

        if (financialsUrl) {
          financialsText = await extractTextFromBlobUrl(financialsUrl, financialsFilename || 'file.pdf')
        }
      } catch (fetchErr) {
        console.error('File fetch/extract error:', fetchErr)
        return NextResponse.json(
          { error: `Failed to read uploaded files: ${(fetchErr as Error).message}` },
          { status: 502 },
        )
      }
    }

    // --- Validate extracted text ---
    if (!pitchDeckText || pitchDeckText.trim().length < 50) {
      console.error('Pitch deck text extraction yielded too little text:', pitchDeckText?.length || 0, 'chars')
      return NextResponse.json(
        { error: 'Could not extract enough text from your pitch deck. Please ensure the PDF contains selectable text (not scanned images).' },
        { status: 422 },
      )
    }

    console.log(`Extracted text: pitchDeck=${pitchDeckText.length} chars, financials=${financialsText.length} chars, supplementary=${supplementaryDocs.length} docs`)

    // --- Get company stage from profile for stage-adjusted scoring weights ---
    let companyStage = ''
    if (userId) {
      try {
        const profile = await getProfileByUserId(userId)
        companyStage = profile?.company_stage || ''
      } catch { /* continue with default weights */ }
    }

    // If re-scoring, also try to get stage from the company page
    if (companyPageId && !companyStage) {
      try {
        const supabase = getSupabase()
        const { data: cp } = await supabase
          .from('company_pages')
          .select('stage')
          .eq('id', companyPageId)
          .single()
        companyStage = cp?.stage || ''
      } catch { /* continue with default weights */ }
    }

    // --- Score with Claude ---
    let fullResult
    try {
      fullResult = await scoreStartup(
        pitchDeckText,
        financialsText,
        linkedinUrl || '',
        companyStage,
        supplementaryDocs.length > 0 ? supplementaryDocs : undefined,
      )
    } catch (aiErr) {
      // KUN-37: If the input is too large for Claude's context window, return a
      // friendly 413 and delete the stale submission row so the user can retry
      // with a smaller deck (userHasSubmission would otherwise block them).
      if (aiErr instanceof ScoringTooLargeError) {
        console.error('[scoring] Input too large for AI context window')
        if (isDatabaseConfigured() && userId && !isDealRoomRescore) {
          try {
            const supabase = getSupabase()
            await supabase.from('submissions').delete().eq('id', submissionId)
          } catch (cleanupErr) {
            console.error('Failed to clean up stale submission after too-large error:', cleanupErr)
          }
        }
        return NextResponse.json(
          { error: aiErr.message },
          { status: 413 },
        )
      }
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

        // Save scored_documents on the submission if we have them
        if (scoredDocuments.length > 0) {
          try {
            const supabase = getSupabase()
            await supabase
              .from('submissions')
              .update({ scored_documents: scoredDocuments })
              .eq('id', submissionId)
          } catch (sdErr) {
            console.error('Failed to save scored_documents (continuing):', sdErr)
          }
        }

        // Build 6-dimension breakdown for KUN-21 scoring transparency
        const fr = fullResult as any
        const dimensionScores = {
          team: { score: fr?.team_score ?? 0, grade: fr?.team_grade ?? null, summary: fr?.team_summary ?? null },
          market: { score: fr?.market_score ?? 0, grade: fr?.market_grade ?? null, summary: fr?.market_summary ?? null },
          product: { score: fr?.product_score ?? 0, grade: fr?.product_grade ?? null, summary: fr?.product_summary ?? null },
          traction: { score: fr?.traction_score ?? 0, grade: fr?.traction_grade ?? null, summary: fr?.traction_summary ?? null },
          financial: { score: fr?.financial_score ?? 0, grade: fr?.financial_grade ?? null, summary: fr?.financial_summary ?? null },
          fundraise_readiness: { score: fr?.fundraise_readiness_score ?? 0, grade: fr?.fundraise_readiness_grade ?? null, summary: fr?.fundraise_readiness_summary ?? null },
        }

        // Create or update company page with AI-extracted profile + user profile data
        if (userId) {
          const cp = (fullResult as any)?.company_profile || {}
          let profile: Awaited<ReturnType<typeof getProfileByUserId>> = null
          try {
            profile = await getProfileByUserId(userId)
          } catch { /* continue without profile data */ }

          if (companyPageId) {
            // Re-scoring: update existing company page with new score + AI analysis
            // For deal room re-score, get pdf_url/financials_url from the scored docs
            let rescorePdfUrl = pitchDeckUrl || undefined
            let rescoreFinUrl = financialsUrl || undefined

            if (isDealRoomRescore) {
              // Find the pitch deck and financials URLs from the scored documents
              try {
                const supabase = getSupabase()
                const pitchDoc = scoredDocuments.find(d => d.category === 'pitch_deck')
                const finDoc = scoredDocuments.find(d => d.category === 'financials')

                if (pitchDoc) {
                  const { data: pd } = await supabase
                    .from('dealroom_documents')
                    .select('file_url')
                    .eq('id', pitchDoc.id)
                    .single()
                  if (pd?.file_url) rescorePdfUrl = pd.file_url
                }
                if (finDoc) {
                  const { data: fd } = await supabase
                    .from('dealroom_documents')
                    .select('file_url')
                    .eq('id', finDoc.id)
                    .single()
                  if (fd?.file_url) rescoreFinUrl = fd.file_url
                }
              } catch { /* continue with existing URLs */ }
            }

            await updateCompanyPageScore(companyPageId, {
              submissionId,
              overallScore: (fullResult as any)?.overall_score || 0,
              description: (fullResult as any)?.description || undefined,
              problemSummary: cp.problem_summary || undefined,
              solutionSummary: cp.solution_summary || undefined,
              businessModel: cp.business_model || undefined,
              traction: cp.traction || undefined,
              useOfFunds: cp.use_of_funds || undefined,
              keyRisks: cp.key_risks || undefined,
              pdfUrl: rescorePdfUrl,
              financialsUrl: rescoreFinUrl,
              dimensionScores,
            })

            // Update deals record ai_score
            try {
              const supabase = getSupabase()
              await supabase.from('deals')
                .update({ ai_score: (fullResult as any)?.overall_score || null })
                .eq('company_id', companyPageId)
            } catch { /* ignore */ }

            // Auto-populate deal room with uploaded documents on re-score (only for non-deal-room re-scores)
            if (!isDealRoomRescore) {
              try {
                const supabase = getSupabase()
                if (pitchDeckUrl) {
                  const { data: existingDoc } = await supabase
                    .from('dealroom_documents')
                    .select('id')
                    .eq('company_id', companyPageId)
                    .eq('category', 'pitch_deck')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                  if (existingDoc) {
                    await supabase.from('dealroom_documents').update({
                      file_url: pitchDeckUrl,
                      file_name: pitchDeckFilename || 'pitch-deck.pdf',
                    }).eq('id', existingDoc.id)
                  } else {
                    await supabase.from('dealroom_documents').insert({
                      company_id: companyPageId,
                      uploaded_by: userId,
                      file_name: pitchDeckFilename || 'pitch-deck.pdf',
                      file_url: pitchDeckUrl,
                      file_size: 0,
                      file_type: 'application/pdf',
                      category: 'pitch_deck',
                      is_public: true,
                    })
                  }
                }
                if (financialsUrl) {
                  const { data: existingFin } = await supabase
                    .from('dealroom_documents')
                    .select('id')
                    .eq('company_id', companyPageId)
                    .eq('category', 'financials')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                  if (existingFin) {
                    await supabase.from('dealroom_documents').update({
                      file_url: financialsUrl,
                      file_name: financialsFilename || 'financials.pdf',
                    }).eq('id', existingFin.id)
                  } else {
                    await supabase.from('dealroom_documents').insert({
                      company_id: companyPageId,
                      uploaded_by: userId,
                      file_name: financialsFilename || 'financials.pdf',
                      file_url: financialsUrl,
                      file_size: 0,
                      file_type: 'application/pdf',
                      category: 'financials',
                      is_public: true,
                    })
                  }
                }
              } catch (drErr) {
                console.error('Failed to update dealroom docs on re-score (continuing):', drErr)
              }
            }

            // Get slug from existing company page
            try {
              const supabase = getSupabase()
              const { data: existing } = await supabase
                .from('company_pages')
                .select('slug')
                .eq('id', companyPageId)
                .single()
              slug = existing?.slug
            } catch { /* ignore */ }
          } else {
            // First scoring: create new company page
            const companyName = profile?.company_name ||
              cp.company_name ||
              email.split('@')[1]?.split('.')[0] ||
              'Unnamed Company'

            // User's industry choice (from onboarding) takes precedence over AI extraction
            const industry = profile?.industry || cp.industry || undefined

            const result = await createCompanyPage({
              userId,
              submissionId,
              companyName,
              overallScore: (fullResult as any)?.overall_score || 0,
              slug: userSlug || undefined,
              description: (fullResult as any)?.description || undefined,
              oneLiner: profile?.one_liner || undefined,
              industry,
              stage: normalizeStage(profile?.company_stage || cp.stage || ''),
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
              companyLinkedinUrl: companyLinkedinUrl || undefined,
              foundingTeam: foundingTeam || undefined,
              pdfUrl: pitchDeckUrl || undefined,
              financialsUrl: financialsUrl || undefined,
              source: 'startup_submission',
              dimensionScores,
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

              // Auto-populate deal room with uploaded documents
              try {
                const supabase = getSupabase()
                const dealroomDocs = []
                if (pitchDeckUrl) {
                  dealroomDocs.push({
                    company_id: result.id,
                    uploaded_by: userId,
                    file_name: pitchDeckFilename || 'pitch-deck.pdf',
                    file_url: pitchDeckUrl,
                    file_size: 0,
                    file_type: 'application/pdf',
                    category: 'pitch_deck',
                    is_public: true,
                  })
                }
                if (financialsUrl) {
                  dealroomDocs.push({
                    company_id: result.id,
                    uploaded_by: userId,
                    file_name: financialsFilename || 'financials.pdf',
                    file_url: financialsUrl,
                    file_size: 0,
                    file_type: 'application/pdf',
                    category: 'financials',
                    is_public: true,
                  })
                }
                if (dealroomDocs.length > 0) {
                  await supabase.from('dealroom_documents').insert(dealroomDocs)
                }
              } catch (drErr) {
                console.error('Failed to create dealroom docs (continuing):', drErr)
              }
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
