'use client'

import Link from 'next/link'
import { Sparkles, Briefcase, Bookmark, DollarSign, Brain, ArrowRight } from 'lucide-react'

interface MobileDashboardProps {
  userName: string | null
  pipelineDeals: number
  watchlisted: number
  totalPipelineValue: string
  avgScore: string
  deals: { id: string; company_name: string; slug: string | null; score: number | null; stage: string; raise_amount: number | null; industry?: string | null }[]
}

function formatDay() {
  const d = new Date()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}`
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function MobileDashboard({ userName, pipelineDeals, watchlisted, totalPipelineValue, avgScore, deals }: MobileDashboardProps) {
  const firstName = userName?.split(' ')[0] || 'there'

  return (
    <div style={{ padding: '0 20px' }}>
      {/* Greeting */}
      <div style={{ marginTop: 10, marginBottom: 18 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-mute)', marginBottom: 6, fontWeight: 500 }}>
          {formatDay()}
        </div>
        <h1 style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: '-0.02em', fontFamily: 'var(--serif)', fontWeight: 400, margin: 0, color: 'var(--ink)' }}>
          {getGreeting()},<br />{firstName}.
        </h1>
      </div>

      {/* Welcome banner - compact */}
      <div style={{
        background: 'var(--ink)', color: '#f4f3ee', borderRadius: 14,
        padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center',
        position: 'relative', overflow: 'hidden', marginBottom: 22,
      }}>
        <div style={{
          position: 'absolute', right: -30, top: -30, width: 120, height: 120,
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          opacity: 0.22, pointerEvents: 'none',
        }} />
        <div style={{
          width: 32, height: 32, background: 'rgba(255,255,255,0.08)', borderRadius: 8,
          display: 'grid', placeItems: 'center', color: 'var(--accent)', flexShrink: 0,
          position: 'relative', zIndex: 1,
        }}>
          <Sparkles size={16} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f3ee', marginBottom: 2 }}>$100 sourcing credit ready</div>
          <div style={{ fontSize: 11.5, color: 'rgba(244,243,238,0.65)', lineHeight: 1.4 }}>Apply on any deal scored by our intelligence layer.</div>
        </div>
      </div>

      {/* Stat cards - 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <StatCardM label="Pipeline deals" value={String(pipelineDeals)} foot="Active" icon={<Briefcase size={13} />} />
        <StatCardM label="Watchlisted" value={String(watchlisted)} foot="Saved" icon={<Bookmark size={13} />} />
        <StatCardM label="Pipeline value" value={totalPipelineValue} foot="Total" icon={<DollarSign size={13} />} />
        <StatCardM label="Avg score" value={avgScore} foot="Scored deals" icon={<Brain size={13} />} />
      </div>

      {/* Section: Recent deals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '6px 0 12px' }}>
        <h3 style={{ fontSize: 18, fontFamily: 'var(--serif)', fontWeight: 400, margin: 0 }}>Recent deals</h3>
        <Link href="/pipeline" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none' }}>View all</Link>
      </div>

      {/* Deal rows */}
      {deals.length === 0 ? (
        <div style={{
          background: 'var(--bg-elev)', border: '1px dashed var(--line-strong)',
          borderRadius: 14, padding: '36px 20px', textAlign: 'center',
        }}>
          <div style={{ width: 40, height: 40, margin: '0 auto 12px', borderRadius: '50%', background: 'var(--bg-sunk)', color: 'var(--ink-faint)', display: 'grid', placeItems: 'center' }}>
            <Briefcase size={16} />
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No deals yet</div>
          <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Add companies to start building your pipeline.</div>
        </div>
      ) : (
        deals.slice(0, 5).map((deal) => (
          <Link
            key={deal.id}
            href={deal.slug ? `/company/${deal.slug}` : '#'}
            style={{
              background: 'var(--bg-elev)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12,
              alignItems: 'center', textDecoration: 'none', color: 'var(--ink)',
            }}
          >
            <div style={{
              width: 38, height: 38, background: 'var(--bg-sunk)', borderRadius: 8,
              display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)', fontSize: 15,
              color: 'var(--ink)',
            }}>
              {getInitials(deal.company_name)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{deal.company_name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                {deal.industry || 'Unknown'} · {deal.stage}
              </div>
            </div>
            {deal.score != null && (
              <div style={{
                background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              }}>
                {deal.score}
              </div>
            )}
          </Link>
        ))
      )}
    </div>
  )
}

function StatCardM({ label, value, foot, icon }: { label: string; value: string; foot: string; icon: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--line)',
      borderRadius: 14, padding: '14px 14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-mute)', marginBottom: 12 }}>
        <span>{label}</span>
        {icon}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 4 }}>{foot}</div>
    </div>
  )
}
