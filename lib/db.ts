import { Pool } from 'pg'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required')
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    })
    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err)
      pool = null
    })
  }
  return pool
}

export function isDatabaseConfigured(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL)
}

export interface Submission {
  id: string
  email: string
  linkedin_url: string | null
  pitch_deck_url: string | null
  financials_url: string | null
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

export async function initializeDatabase() {
  const db = getPool()
  await db.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      linkedin_url TEXT,
      pitch_deck_url TEXT,
      financials_url TEXT,
      voice_note_url TEXT,
      overall_score INTEGER,
      team_score INTEGER,
      team_grade VARCHAR(2),
      market_score INTEGER,
      market_grade VARCHAR(2),
      product_score INTEGER,
      product_grade VARCHAR(2),
      financial_score INTEGER,
      financial_grade VARCHAR(2),
      full_analysis JSONB,
      stripe_session_id VARCHAR(255),
      paid BOOLEAN DEFAULT FALSE,
      paid_at TIMESTAMP,
      report_url TEXT,
      report_generated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

export async function createSubmission(data: {
  id: string
  email: string
  linkedin_url: string
  pitch_deck_url: string
  financials_url: string
  voice_note_url?: string
}) {
  const db = getPool()
  const result = await db.query(
    `INSERT INTO submissions (id, email, linkedin_url, pitch_deck_url, financials_url, voice_note_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.id, data.email, data.linkedin_url, data.pitch_deck_url, data.financials_url, data.voice_note_url || null]
  )
  return result.rows[0] as Submission
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

  const db = getPool()
  await db.query(
    `UPDATE submissions SET
      overall_score = $1,
      team_score = $2,
      team_grade = $3,
      market_score = $4,
      market_grade = $5,
      product_score = $6,
      product_grade = $7,
      financial_score = $8,
      financial_grade = $9,
      full_analysis = $10,
      updated_at = NOW()
    WHERE id = $11`,
    [
      a.overall_score,
      a.dimensions.team.score,
      a.dimensions.team.letter_grade,
      a.dimensions.market.score,
      a.dimensions.market.letter_grade,
      a.dimensions.product.score,
      a.dimensions.product.letter_grade,
      a.dimensions.financial.score,
      a.dimensions.financial.letter_grade,
      JSON.stringify(analysis),
      id,
    ]
  )
}

export async function getSubmission(id: string) {
  const db = getPool()
  const result = await db.query('SELECT * FROM submissions WHERE id = $1', [id])
  return result.rows[0] as Submission | undefined
}

export async function markSubmissionPaid(id: string, stripeSessionId: string) {
  const db = getPool()
  await db.query(
    `UPDATE submissions SET
      paid = TRUE,
      stripe_session_id = $1,
      paid_at = NOW(),
      updated_at = NOW()
    WHERE id = $2`,
    [stripeSessionId, id]
  )
}

export async function updateReportUrl(id: string, reportUrl: string) {
  const db = getPool()
  await db.query(
    `UPDATE submissions SET
      report_url = $1,
      report_generated_at = NOW(),
      updated_at = NOW()
    WHERE id = $2`,
    [reportUrl, id]
  )
}
