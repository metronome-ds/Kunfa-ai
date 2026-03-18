import { createClient } from '@supabase/supabase-js'
import { normalizeStage } from './constants'

// Use service role key to bypass RLS in API routes
export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function isDatabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export interface Submission {
  id: string
  user_id: string
  email: string
  company_name: string | null
  linkedin_url: string | null
  pitch_deck_url: string | null
  pitch_deck_filename: string | null
  financials_url: string | null
  financials_filename: string | null
  voice_note_url: string | null
  overall_score: number | null
  team_score: number | null
  team_grade: string | null
  market_score: number | null
  market_grade: string | null
  product_score: number | null
  product_grade: string | null
  financial_score: number | null
  financial_grade: string | null
  full_analysis: Record<string, unknown> | null
  stripe_session_id: string | null
  paid: boolean
  paid_at: string | null
  report_url: string | null
  report_generated_at: string | null
  created_at: string
  updated_at: string
}

// No-op for backward compatibility — tables are created via Supabase migrations
export async function initializeDatabase() {
  // Tables already created via Supabase migrations
}

// Find or create a Supabase auth user by email, returns user_id
export async function findOrCreateUser(email: string): Promise<string> {
  const supabase = getSupabase()

  // Check if user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === email)

  if (existingUser) {
    return existingUser.id
  }

  // Create new user (unconfirmed — they'll need to verify or set password)
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
  })

  if (error) throw new Error(`Failed to create user: ${error.message}`)

  // Create profile for the new user
  await supabase.from('profiles').insert({
    user_id: newUser.user.id,
    email,
  })

  return newUser.user.id
}

// Get user profile by user_id
export async function getProfileByUserId(userId: string) {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('profiles')
    .select('full_name, job_title, company_name, company_country, company_website, one_liner, industry, company_stage, linkedin_url, team_size')
    .eq('user_id', userId)
    .single()
  return data
}

// Check if a user already has a submission
export async function userHasSubmission(userId: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('submissions')
    .select('id')
    .eq('user_id', userId)
    .single()
  return !!data
}

export async function createSubmission(data: {
  id: string
  user_id: string
  email: string
  linkedin_url?: string | null
  pitch_deck_url: string
  pitch_deck_filename?: string | null
  financials_url?: string | null
  financials_filename?: string | null
}) {
  const supabase = getSupabase()
  const { data: submission, error } = await supabase
    .from('submissions')
    .insert({
      id: data.id,
      user_id: data.user_id,
      email: data.email,
      linkedin_url: data.linkedin_url || null,
      pitch_deck_url: data.pitch_deck_url,
      pitch_deck_filename: data.pitch_deck_filename || null,
      financials_url: data.financials_url || null,
      financials_filename: data.financials_filename || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create submission: ${error.message}`)
  return submission as Submission
}

export async function updateSubmissionScore(
  id: string,
  analysis: Record<string, unknown>,
) {
  const a = analysis as {
    overall_score: number
    team_score: number
    team_grade: string
    market_score: number
    market_grade: string
    product_score: number
    product_grade: string
    financial_score: number
    financial_grade: string
  }

  const supabase = getSupabase()
  const { error } = await supabase
    .from('submissions')
    .update({
      overall_score: a.overall_score,
      team_score: a.team_score,
      team_grade: a.team_grade,
      market_score: a.market_score,
      market_grade: a.market_grade,
      product_score: a.product_score,
      product_grade: a.product_grade,
      financial_score: a.financial_score,
      financial_grade: a.financial_grade,
      full_analysis: analysis,
    })
    .eq('id', id)

  if (error) console.error('Failed to update submission score:', error)
}

export async function getSubmission(id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return undefined
  return data as Submission
}

export async function markSubmissionPaid(id: string, stripeSessionId: string) {
  const supabase = getSupabase()
  const { error, count } = await supabase
    .from('submissions')
    .update({
      paid: true,
      stripe_session_id: stripeSessionId,
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error(`markSubmissionPaid failed for ${id}:`, error.message)
    throw error
  }
  console.log(`markSubmissionPaid: updated submission ${id}, count=${count}`)
}

export async function updateReportUrl(id: string, reportUrl: string) {
  const supabase = getSupabase()
  await supabase
    .from('submissions')
    .update({
      report_url: reportUrl,
      report_generated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

// Update an existing company page with new score data (for re-scoring)
export async function updateCompanyPageScore(companyPageId: string, data: {
  submissionId: string
  overallScore: number
  description?: string
  problemSummary?: string
  solutionSummary?: string
  businessModel?: string
  traction?: string
  useOfFunds?: string
  keyRisks?: string
  pdfUrl?: string
  financialsUrl?: string
}) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('company_pages')
    .update({
      submission_id: data.submissionId,
      overall_score: data.overallScore,
      description: data.description || undefined,
      problem_summary: data.problemSummary || undefined,
      solution_summary: data.solutionSummary || undefined,
      business_model: data.businessModel || undefined,
      traction: data.traction || undefined,
      use_of_funds: data.useOfFunds || undefined,
      key_risks: data.keyRisks || undefined,
      pdf_url: data.pdfUrl || undefined,
      financials_url: data.financialsUrl || undefined,
    })
    .eq('id', companyPageId)

  if (error) console.error('Failed to update company page score:', error)
}

// Create a company page from a scored submission
export async function createCompanyPage(data: {
  userId: string
  submissionId: string
  companyName: string
  overallScore: number
  slug?: string
  description?: string
  oneLiner?: string
  industry?: string
  stage?: string
  raiseAmount?: number
  teamSize?: number
  foundedYear?: number
  source?: string
  problemSummary?: string
  solutionSummary?: string
  businessModel?: string
  traction?: string
  useOfFunds?: string
  keyRisks?: string
  country?: string
  headquarters?: string
  websiteUrl?: string
  founderName?: string
  founderTitle?: string
  linkedinUrl?: string
  companyLinkedinUrl?: string
  foundingTeam?: { name: string; title: string; email?: string; linkedin?: string }[]
  pdfUrl?: string
  financialsUrl?: string
}) {
  const supabase = getSupabase()

  // Use user-provided slug, or auto-generate from company name
  const slug = data.slug || (
    data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + data.submissionId.slice(0, 8)
  )

  const { data: inserted, error } = await supabase
    .from('company_pages')
    .insert({
      user_id: data.userId,
      submission_id: data.submissionId,
      company_name: data.companyName,
      slug,
      overall_score: data.overallScore,
      description: data.description || null,
      one_liner: data.oneLiner || null,
      industry: data.industry || null,
      stage: data.stage ? normalizeStage(data.stage) : null,
      raise_amount: data.raiseAmount || null,
      team_size: data.teamSize || null,
      founded_year: data.foundedYear || null,
      source: data.source || 'startup_submission',
      problem_summary: data.problemSummary || null,
      solution_summary: data.solutionSummary || null,
      business_model: data.businessModel || null,
      traction: data.traction || null,
      use_of_funds: data.useOfFunds || null,
      key_risks: data.keyRisks || null,
      country: data.country || null,
      headquarters: data.headquarters || null,
      website_url: data.websiteUrl || null,
      founder_name: data.founderName || null,
      founder_title: data.founderTitle || null,
      linkedin_url: data.linkedinUrl || null,
      company_linkedin_url: data.companyLinkedinUrl || null,
      founding_team: data.foundingTeam && data.foundingTeam.length > 0 ? data.foundingTeam : null,
      pdf_url: data.pdfUrl || null,
      financials_url: data.financialsUrl || null,
    })
    .select('id')
    .single()

  if (error) console.error('Failed to create company page:', error)
  return { slug, id: inserted?.id as string | undefined }
}
