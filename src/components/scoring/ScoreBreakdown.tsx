'use client'

/**
 * ScoreBreakdown — KUN-21 scoring transparency
 *
 * Horizontal bar chart showing all 6 dimension scores.
 * Used on the startup dashboard and investor-facing company profile.
 */

export interface DimensionScore {
  score: number
  grade?: string | null
  summary?: string | null
}

export interface DimensionScores {
  team?: DimensionScore
  market?: DimensionScore
  product?: DimensionScore
  traction?: DimensionScore
  financial?: DimensionScore
  fundraise_readiness?: DimensionScore
}

interface ScoreBreakdownProps {
  dimensions: DimensionScores | Record<string, unknown> | null | undefined
  overallScore?: number | null
  title?: string
  showSummaries?: boolean
}

const DIMENSION_META: Record<keyof DimensionScores, { label: string; icon: string }> = {
  team: { label: 'Team & Founders', icon: '👥' },
  market: { label: 'Market Opportunity', icon: '📈' },
  product: { label: 'Product & Tech', icon: '💡' },
  traction: { label: 'Traction & Growth', icon: '📊' },
  financial: { label: 'Financial Health', icon: '💰' },
  fundraise_readiness: { label: 'Fundraise Readiness', icon: '🎯' },
}

const ORDER: (keyof DimensionScores)[] = [
  'team',
  'market',
  'product',
  'traction',
  'financial',
  'fundraise_readiness',
]

function getBarColor(score: number): string {
  // Raw dimension scores are 0-25
  if (score >= 20) return 'bg-[#0168FE]'
  if (score >= 15) return 'bg-blue-400'
  if (score >= 10) return 'bg-amber-400'
  return 'bg-red-400'
}

function getGradeColor(grade: string | null | undefined): string {
  if (!grade) return 'bg-gray-100 text-gray-500'
  if (grade.startsWith('A')) return 'bg-green-50 text-green-700'
  if (grade.startsWith('B')) return 'bg-blue-50 text-blue-700'
  if (grade.startsWith('C')) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function normalizeDim(val: unknown): DimensionScore | undefined {
  if (!val || typeof val !== 'object') return undefined
  const obj = val as Record<string, unknown>
  const rawScore = obj.score
  if (typeof rawScore !== 'number') return undefined
  return {
    score: rawScore,
    grade: (typeof obj.grade === 'string' ? obj.grade : typeof obj.letter_grade === 'string' ? obj.letter_grade : null) as string | null,
    summary: (typeof obj.summary === 'string' ? obj.summary : typeof obj.headline === 'string' ? obj.headline : null) as string | null,
  }
}

export default function ScoreBreakdown({
  dimensions,
  overallScore,
  title = 'Score Breakdown',
  showSummaries = false,
}: ScoreBreakdownProps) {
  if (!dimensions || typeof dimensions !== 'object') {
    return null
  }

  const raw = dimensions as Record<string, unknown>
  const rows = ORDER.map((key) => ({
    key,
    meta: DIMENSION_META[key],
    dim: normalizeDim(raw[key]),
  })).filter((r) => r.dim !== undefined)

  if (rows.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {typeof overallScore === 'number' && (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#0168FE]">{overallScore}</span>
            <span className="text-xs text-gray-400">/100</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {rows.map(({ key, meta, dim }) => {
          if (!dim) return null
          const pct = Math.min(100, Math.max(0, (dim.score / 25) * 100))
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{meta.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{meta.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {dim.grade && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getGradeColor(dim.grade)}`}>
                      {dim.grade}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-gray-900 tabular-nums">
                    {dim.score}<span className="text-gray-400 font-normal">/25</span>
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(dim.score)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {showSummaries && dim.summary && (
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{dim.summary}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
