import { createClient } from '@supabase/supabase-js'

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
    .select('full_name, job_title, company_name, company_country, company_website, one_liner')
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
  linkedin_url: string
  pitch_deck_url: string
  pitch_deck_filename?: string
  financials_url: string
  financials_filename?: string
  voice_note_url?: string
}) {
  const supabase = getSupabase()
  const { data: submission, error } = await supabase
    .from('submissions')
    .insert({
      id: data.id,
      user_id: data.user_id,
      email: data.email,
      linkedin_url: data.linkedin_url,
      pitch_deck_url: data.pitch_deck_url,
      pitch_deck_filename: data.pitch_deck_filename || null,
      financials_url: data.financials_url,
      financials_filename: data.financials_filename || null,
      voice_note_url: data.voice_note_url || null,
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
    dimensions: {
      team: { score: number; letter_grade: string }
      market: { score: number; letter_grade: string }
      product: { score: number; letter_grade: string }
      financial: { score: number; letter_grade: string }
    }
  }

  const supabase = getSupabase()
  const { error } = await supabase
    .from('submissions')
    .update({
      overall_score: a.overall_score,
      team_score: a.dimensions.team.score,
      team_grade: a.dimensions.team.letter_grade,
      market_score: a.dimensions.market.score,
      market_grade: a.dimensions.market.letter_grade,
      product_score: a.dimensions.product.score,
      product_grade: a.dimensions.product.letter_grade,
      financial_score: a.dimensions.financial.score,
      financial_grade: a.dimensions.financial.letter_grade,
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
  await supabase
    .from('submissions')
    .update({
      paid: true,
      stripe_session_id: stripeSessionId,
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)
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

// Create a company page from a scored submission
export async function createCompanyPage(data: {
  userId: string
  submissionId: string
  companyName: string
  overallScore: number
  description?: string
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
  websiteUrl?: string
  founderName?: string
  founderTitle?: string
}) {
  const supabase = getSupabase()
  // Generate slug from company name
  const slug = data.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + data.submissionId.slice(0, 8)

  const { data: inserted, error } = await supabase
    .from('company_pages')
    .insert({
      user_id: data.userId,
      submission_id: data.submissionId,
      company_name: data.companyName,
      slug,
      overall_score: data.overallScore,
      description: data.description || null,
      industry: data.industry || null,
      stage: data.stage || null,
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
      website_url: data.websiteUrl || null,
      founder_name: data.founderName || null,
      founder_title: data.founderTitle || null,
    })
    .select('id')
    .single()

  if (error) console.error('Failed to create company page:', error)
  return { slug, id: inserted?.id as string | undefined }
}
