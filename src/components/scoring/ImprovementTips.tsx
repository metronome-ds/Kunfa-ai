'use client'

/**
 * ImprovementTips — KUN-21
 *
 * Templated improvement recommendations for sub-75 companies.
 * Identifies the 2-3 weakest dimensions and shows static, actionable tips.
 */

import Link from 'next/link'
import { RefreshCw } from 'lucide-react'

interface ImprovementTipsProps {
  dimensions: Record<string, unknown> | null | undefined
  onRescore?: () => void
}

const TIPS: Record<string, { label: string; icon: string; tips: string[] }> = {
  team: {
    label: 'Team & Founders',
    icon: '👥',
    tips: [
      'Highlight prior startup or domain experience for each founder with specific outcomes (exits, revenue, users).',
      'Add complete LinkedIn URLs and explicit roles (CEO, CTO, etc.) for every co-founder.',
      'Close critical gaps (e.g. technical lead, GTM lead) — or explain your hiring plan to fill them.',
    ],
  },
  market: {
    label: 'Market Opportunity',
    icon: '📈',
    tips: [
      'Include a credible, bottom-up TAM / SAM / SOM with sources — not just a top-down industry number.',
      'Demonstrate why now: regulatory shifts, tech unlocks, or behaviour changes driving the timing.',
      'Name 3-5 comparable companies and articulate your concrete differentiation vs. each.',
    ],
  },
  product: {
    label: 'Product & Tech',
    icon: '💡',
    tips: [
      'Show real product screenshots or a live demo — not just mockups or roadmap slides.',
      'Quantify your technical moat: proprietary data, models, IP, or hard-to-replicate workflow.',
      'Describe the 10x better experience vs. incumbents with a concrete before/after example.',
    ],
  },
  traction: {
    label: 'Traction & Growth',
    icon: '📊',
    tips: [
      'Report month-over-month growth for the last 6 months with a clear chart (revenue, users, or usage).',
      'Add retention / engagement metrics (D30, weekly active, NRR) — growth without retention is a red flag.',
      'Show early customer logos, design partners, or signed LOIs to validate demand.',
    ],
  },
  financial: {
    label: 'Financial Health',
    icon: '💰',
    tips: [
      'Upload a full financial model: historicals, 24-36 month projections, unit economics, burn, runway.',
      'Disclose current cash, monthly burn, and runway clearly — investors will ask on slide 1.',
      'Show a credible path to break-even or the next milestone this round unlocks.',
    ],
  },
  fundraise_readiness: {
    label: 'Fundraise Readiness',
    icon: '🎯',
    tips: [
      'State the exact round size, valuation (or cap), instrument (SAFE / priced), and minimum ticket.',
      'Break down use of funds by category (team, product, GTM) with measurable milestones.',
      'Prepare a data room with deck, financials, cap table, and customer references before reaching out.',
    ],
  },
}

const ORDER = ['team', 'market', 'product', 'traction', 'financial', 'fundraise_readiness'] as const

export default function ImprovementTips({ dimensions, onRescore }: ImprovementTipsProps) {
  if (!dimensions || typeof dimensions !== 'object') return null

  const raw = dimensions as Record<string, unknown>

  // Extract scores for each known dimension
  const scored = ORDER
    .map((key) => {
      const v = raw[key]
      if (!v || typeof v !== 'object') return null
      const score = (v as Record<string, unknown>).score
      if (typeof score !== 'number') return null
      return { key, score }
    })
    .filter((x): x is { key: typeof ORDER[number]; score: number } => x !== null)

  if (scored.length === 0) return null

  // Pick the 3 weakest dimensions (lowest raw score out of 25)
  const weakest = [...scored].sort((a, b) => a.score - b.score).slice(0, 3)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">How to improve your score</h3>
        <p className="text-xs text-gray-500 mt-1">
          Focus on these dimensions to unlock investor discovery (Kunfa Score 75+).
        </p>
      </div>

      <div className="space-y-4">
        {weakest.map(({ key, score }) => {
          const tip = TIPS[key]
          if (!tip) return null
          return (
            <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{tip.icon}</span>
                  <h4 className="text-sm font-semibold text-gray-900">{tip.label}</h4>
                </div>
                <span className="text-xs text-gray-500 tabular-nums">
                  {score}<span className="text-gray-400">/25</span>
                </span>
              </div>
              <ul className="space-y-1.5 mt-2">
                {tip.tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                    <span className="text-[#0168FE] mt-0.5">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {onRescore && (
          <button
            onClick={onRescore}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0168FE] text-white rounded-lg text-sm font-medium hover:bg-[#0050CC] transition"
          >
            <RefreshCw className="w-4 h-4" />
            Re-score My Company
          </button>
        )}
        <Link
          href="/how-it-works"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          How scoring works
        </Link>
      </div>
    </div>
  )
}
