'use client'

import { useState, useRef } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, Briefcase } from 'lucide-react'

// ── Service data ──

interface Service {
  id: string
  title: string
  category: string
  categoryColor: string
  price: string
  description: string
  dimensions: string[]
  includes: string[]
}

const SERVICES: Service[] = [
  {
    id: 'shariah-compliance',
    title: 'Shariah Compliance Certification',
    category: 'Shariah Advisory',
    categoryColor: 'bg-purple-100 text-purple-700',
    price: '$3,500',
    description: 'Full Shariah review of business model, revenue sources, and deal structure. Certification issued by qualified scholar.',
    dimensions: ['Fundraise Readiness', 'Financial'],
    includes: [
      'Business model Shariah screening (riba, gharar, haram activity)',
      'Revenue source compliance analysis',
      'Debt structure review (Murabaha/Musharakah eligibility)',
      'Scholar certification letter',
      'Kunfa Shariah badge on company profile',
      'Annual renewal support',
    ],
  },
  {
    id: 'corporate-structuring',
    title: 'Corporate Structuring & Investment Docs',
    category: 'Legal',
    categoryColor: 'bg-[#F0F7FF] text-[#007CF8]',
    price: '$7,500',
    description: 'DIFC/ADGM entity setup, investment agreements, SAFE/convertible notes, Shariah-compliant structures.',
    dimensions: ['Fundraise Readiness', 'Team'],
    includes: [
      'Entity formation (DIFC, ADGM, RAKEZ, mainland)',
      'Investment agreement drafting (SAFE, priced round, convertible)',
      'Shariah-compliant deal structuring (Murabaha, Musharakah)',
      'IP assignment and protection',
      'Shareholder agreement and cap table cleanup',
      'Term sheet review and negotiation support',
    ],
  },
  {
    id: 'financial-model',
    title: 'Financial Model & Audit Readiness',
    category: 'Financial Advisory',
    categoryColor: 'bg-emerald-100 text-emerald-700',
    price: '$5,000',
    description: 'Investor-grade financial model, IFRS-ready books, audit prep, and VAT compliance for GCC entities.',
    dimensions: ['Financial', 'Traction'],
    includes: [
      '3-year investor-grade financial model',
      'IFRS bookkeeping setup and cleanup',
      'Audit preparation and auditor coordination',
      'VAT registration and compliance (UAE/KSA/Bahrain)',
      'Transfer pricing documentation',
      'Monthly CFO-as-a-service (optional add-on)',
    ],
  },
  {
    id: 'growth-strategy',
    title: 'Growth Strategy & Market Entry',
    category: 'Growth & GTM',
    categoryColor: 'bg-amber-100 text-amber-700',
    price: '$10,000',
    description: 'Go-to-market strategy, product-market fit validation, demand gen, and GCC market entry playbook.',
    dimensions: ['Market', 'Traction', 'Product'],
    includes: [
      'GCC market sizing and competitive landscape',
      'Go-to-market strategy and channel plan',
      'Product-market fit assessment and customer discovery',
      'Demand generation campaign setup',
      'Pricing strategy and unit economics modeling',
      '90-day growth sprint with weekly check-ins',
    ],
  },
  {
    id: 'product-development',
    title: 'Product Development & AI Integration',
    category: 'Technology',
    categoryColor: 'bg-teal-100 text-teal-700',
    price: '$25,000',
    description: 'MVP build, AI feature integration, technical architecture review, and CTO-as-a-service.',
    dimensions: ['Product', 'Team'],
    includes: [
      'Technical architecture review and recommendations',
      'MVP/v1 product development',
      'AI/ML feature integration and automation',
      'Infrastructure setup (cloud, CI/CD, monitoring)',
      'Technical due diligence preparation',
      'CTO-as-a-service (fractional, monthly retainer)',
    ],
  },
  {
    id: 'pitch-preparation',
    title: 'Investor-Ready Pitch Preparation',
    category: 'Pitch & Fundraise Prep',
    categoryColor: 'bg-rose-100 text-rose-700',
    price: '$2,500',
    description: 'Pitch deck redesign, investor narrative, data room setup, and mock pitch sessions with real investors.',
    dimensions: ['Fundraise Readiness', 'Market'],
    includes: [
      'Pitch deck audit and redesign',
      'Investor narrative and story crafting',
      'Data room setup and organization',
      'Financial summary and key metrics preparation',
      '2x mock pitch sessions with experienced investors',
      'Post-session feedback and iteration',
    ],
  },
  {
    id: 'esg-reporting',
    title: 'ESG Reporting & Impact Assessment',
    category: 'ESG & Compliance',
    categoryColor: 'bg-pink-100 text-pink-700',
    price: '$4,000',
    description: 'SDG mapping, SFDR classification, ESG scoring, and impact reporting for EU and GCC investors.',
    dimensions: ['Fundraise Readiness', 'Market'],
    includes: [
      'ESG materiality assessment',
      'SDG alignment mapping (17 goals)',
      'SFDR classification (Article 6/8/9)',
      'Impact measurement framework setup',
      'ESG report for investor distribution',
      'Kunfa ESG badge on company profile',
    ],
  },
  {
    id: 'board-advisory',
    title: 'Board Advisory & Strategic Planning',
    category: 'Strategy & Advisory',
    categoryColor: 'bg-gray-100 text-gray-700',
    price: '$8,000/mo',
    description: 'Board-level strategic guidance, expansion planning, M&A advisory, and investor relations management.',
    dimensions: ['Team', 'Market'],
    includes: [
      'Monthly board-level strategic review',
      'Market expansion playbook (GCC to global or global to GCC)',
      'M&A target identification and evaluation',
      'Investor relations and LP communication strategy',
      'Quarterly board deck preparation',
      'On-call strategic advisory',
    ],
  },
]

const SERVICE_OPTIONS = [
  { value: '', label: 'Select a service...' },
  ...SERVICES.map(s => ({ value: s.title, label: s.title })),
  { value: 'Not sure — I need guidance', label: 'Not sure — I need guidance' },
]

// ── Service Card ──

function ServiceCard({ service, onBook }: { service: Service; onBook: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
      {/* Category badge */}
      <span className={`inline-block self-start px-2.5 py-1 text-xs font-semibold rounded-full mb-3 ${service.categoryColor}`}>
        {service.category}
      </span>

      {/* Title + Price */}
      <h3 className="text-lg font-bold text-gray-900 mb-1">{service.title}</h3>
      <p className="text-2xl font-bold text-[#007CF8] mb-3">{service.price}</p>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{service.description}</p>

      {/* Dimension tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {service.dimensions.map(dim => (
          <span key={dim} className="px-2 py-0.5 text-[11px] font-medium bg-[#F0F7FF] text-[#007CF8] rounded-full">
            {dim}
          </span>
        ))}
      </div>

      {/* Expandable SOW */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition mb-4"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        What&apos;s included
      </button>

      {expanded && (
        <ul className="space-y-2 mb-4 pl-1">
          {service.includes.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <div className="mt-auto">
        <button
          onClick={onBook}
          className="w-full py-2.5 rounded-lg bg-[#007CF8] hover:bg-[#0066D6] text-white text-sm font-semibold transition"
        >
          Book a Discovery Call
        </button>
      </div>
    </div>
  )
}

// ── Discovery Call Form ──

function DiscoveryCallForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', service: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/services/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h3>
        <p className="text-gray-600">We&apos;ll be in touch within 24 hours.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
        <input
          type="text"
          required
          value={form.company}
          onChange={e => setForm({ ...form, company: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service Interested In *</label>
        <select
          required
          value={form.service}
          onChange={e => setForm({ ...form, service: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all"
        >
          {SERVICE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea
          value={form.message}
          onChange={e => setForm({ ...form, message: e.target.value })}
          rows={3}
          placeholder="Tell us about your specific needs..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !form.name || !form.email || !form.company || !form.service}
        className="px-6 py-2.5 rounded-lg bg-[#007CF8] hover:bg-[#0066D6] text-white text-sm font-semibold transition disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Request Discovery Call'}
      </button>
    </form>
  )
}

// ── Provider Application Form ──

function ProviderApplicationForm() {
  const [form, setForm] = useState({ name: '', email: '', services: '', portfolio: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/services/provider-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Application received!</h3>
        <p className="text-gray-600">We&apos;ll review and get back to you within 48 hours.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company / Individual Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Services You Offer *</label>
        <textarea
          required
          value={form.services}
          onChange={e => setForm({ ...form, services: e.target.value })}
          rows={3}
          placeholder="Describe the services you provide..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio / Website URL</label>
        <input
          type="url"
          value={form.portfolio}
          onChange={e => setForm({ ...form, portfolio: e.target.value })}
          placeholder="https://"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea
          value={form.message}
          onChange={e => setForm({ ...form, message: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !form.name || !form.email || !form.services}
        className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-[#F8F9FB] text-sm font-semibold transition disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Apply to Join'}
      </button>
    </form>
  )
}

// ── Main Page ──

export default function ServicesPage() {
  const formRef = useRef<HTMLDivElement>(null)

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-6 h-6 text-[#007CF8]" />
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Expert-led services to accelerate your fundraise and improve your Kunfa Score
        </p>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {SERVICES.map(service => (
          <ServiceCard key={service.id} service={service} onBook={scrollToForm} />
        ))}
      </div>

      {/* Discovery Call Form */}
      <div ref={formRef} className="mb-16 scroll-mt-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Book a Discovery Call</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tell us about your needs and we&apos;ll match you with the right expert.
          </p>
          <DiscoveryCallForm />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 mb-16" />

      {/* Provider Application */}
      <div className="mb-16">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Become a Kunfa Service Provider</h2>
          <p className="text-sm text-gray-500 mb-6">
            Are you an expert in your field? Join our network of vetted service providers.
          </p>
          <ProviderApplicationForm />
        </div>
      </div>
    </div>
  )
}
