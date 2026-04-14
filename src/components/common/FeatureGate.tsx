'use client'

import { useState, useEffect, ReactNode } from 'react'
import { canAccessFeature } from '@/lib/subscription'
import Link from 'next/link'
import {
  FileSearch,
  Users,
  Bot,
  PieChart,
  Calculator,
  BarChart3,
  MessageSquare,
  Check,
  Tag,
} from 'lucide-react'

interface FeatureConfig {
  title: string
  description: string
  bullets: string[]
  requiredTier: string
  price: string
  icon: typeof FileSearch
}

const FEATURE_CONFIGS: Record<string, FeatureConfig> = {
  term_sheet_analyzer: {
    title: 'Term Sheet Analyzer',
    description: 'Upload any term sheet and get instant AI-powered analysis with plain-English explanations.',
    bullets: [
      'AI extracts and explains every clause',
      'Founder-friendly / standard / caution ratings',
      'Market comparison for each term',
      'Save analysis to your private documents',
    ],
    requiredTier: 'starter',
    price: '$20/mo',
    icon: FileSearch,
  },
  create_community: {
    title: 'Kunfa Communities',
    description: 'Create a private deal-sharing space for your investor network. Replace WhatsApp groups with structured deal flow.',
    bullets: [
      'Branded community hub with member directory',
      'Share and discuss deals with your network',
      'Interest signaling and commitment tracking',
      'AI-powered deal scoring for every opportunity',
    ],
    requiredTier: 'fund',
    price: '$499/mo',
    icon: Users,
  },
  ai_copilot: {
    title: 'Kunfa AI Copilot',
    description: 'Your AI deal analyst. Ask questions about any company, compare deals, and get instant due diligence insights.',
    bullets: [
      'Context-aware — knows the deal you\'re looking at',
      'Compare deals across your pipeline',
      'Generate due diligence questions',
      'Thesis matching against your investment preferences',
    ],
    requiredTier: 'pro',
    price: '$49/mo',
    icon: Bot,
  },
  cap_table: {
    title: 'Cap Table Management',
    description: 'Visual cap table with ownership tracking, dilution modeling, and investor-ready exports.',
    bullets: [
      'Track all shareholders and ownership percentages',
      'Model dilution from new funding rounds',
      'Vesting schedule tracking',
      'Export cap table as PDF for investors',
    ],
    requiredTier: 'growth',
    price: '$49/mo',
    icon: PieChart,
  },
  valuation_calculator: {
    title: 'AI Valuation Calculator',
    description: 'Multi-method valuation with DCF, comparable companies, revenue multiples, and AI-recommended approach.',
    bullets: [
      '6 valuation methods side by side',
      'AI suggests the best method for your stage',
      'Pull data from your uploaded financials',
      'Save and share valuations with investors',
    ],
    requiredTier: 'growth',
    price: '$49/mo',
    icon: Calculator,
  },
  lp_reporting: {
    title: 'LP Reporting',
    description: 'Automated quarterly LP reports with portfolio metrics, deal flow analytics, and branded exports.',
    bullets: [
      'Automated quarterly reports',
      'Portfolio performance dashboards',
      'Branded PDF exports for LPs',
      'Real-time LP portal access',
    ],
    requiredTier: 'fund',
    price: '$499/mo',
    icon: BarChart3,
  },
  dms: {
    title: 'Direct Messages',
    description: 'Message other investors directly within your communities.',
    bullets: [
      '1-to-1 messaging with community members',
      'Deal-specific conversations',
      'Message history and search',
    ],
    requiredTier: 'pro',
    price: '$49/mo',
    icon: MessageSquare,
  },
}

function UpgradePrompt({ feature }: { feature: string }) {
  const config = FEATURE_CONFIGS[feature]
  const [showPromo, setShowPromo] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')

  if (!config) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <p className="text-gray-500">This feature requires an upgraded plan.</p>
      </div>
    )
  }

  const Icon = config.icon

  const handleRedeem = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoError('')

    try {
      const res = await fetch('/api/subscription/redeem-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      })

      const data = await res.json()

      if (data.success) {
        setPromoSuccess(`Welcome to ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}! Your access is active for ${data.durationDays} days.`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setPromoError(data.error || 'Invalid promo code.')
      }
    } catch {
      setPromoError('Something went wrong. Please try again.')
    } finally {
      setPromoLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[#007CF8]/10 flex items-center justify-center mx-auto mb-6">
          <Icon className="w-8 h-8 text-[#007CF8]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{config.title}</h1>
        <p className="text-gray-500 max-w-md mx-auto">{config.description}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <ul className="space-y-3">
          {config.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{bullet}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <span className="inline-block px-2.5 py-1 bg-[#007CF8] text-white text-xs font-medium rounded-full uppercase">
              {config.requiredTier}
            </span>
          </div>
          <span className="text-lg font-bold text-gray-900">{config.price}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href="/#pricing"
          className="block w-full py-3 bg-[#007CF8] text-white rounded-lg text-sm font-semibold text-center hover:bg-[#0066D6] transition"
        >
          Upgrade to {config.requiredTier.charAt(0).toUpperCase() + config.requiredTier.slice(1)}
        </Link>

        {!showPromo ? (
          <button
            onClick={() => setShowPromo(true)}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-[#007CF8] font-medium hover:underline"
          >
            <Tag className="w-3.5 h-3.5" />
            Have a promo code?
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              />
              <button
                onClick={handleRedeem}
                disabled={promoLoading || !promoCode.trim()}
                className="px-4 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition disabled:opacity-50"
              >
                {promoLoading ? 'Redeeming...' : 'Redeem'}
              </button>
            </div>
            {promoError && <p className="text-xs text-red-600">{promoError}</p>}
            {promoSuccess && <p className="text-xs text-emerald-600">{promoSuccess}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

interface FeatureGateProps {
  feature: string
  children: ReactNode
}

export default function FeatureGate({ feature, children }: FeatureGateProps) {
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch('/api/subscription')
        if (res.ok) {
          const data = await res.json()
          setHasAccess(canAccessFeature(data.tier, feature))
        }
      } catch {
        // Default to no access on error
      } finally {
        setLoading(false)
      }
    }
    checkAccess()
  }, [feature])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" />
      </div>
    )
  }

  if (!hasAccess) {
    return <UpgradePrompt feature={feature} />
  }

  return <>{children}</>
}
