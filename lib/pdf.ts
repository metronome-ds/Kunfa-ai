import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { ScoringResult, ExpandedMemoContent } from './anthropic'

// Color Scheme
const green = '#10B981'
const navy = '#0F172A'
const gray = '#64748B'
const lightGray = '#F8FAFC'
const indigo = '#6366F1'
const red = '#EF4444'
const amber = '#F59E0B'

const styles = StyleSheet.create({
  page: {
    padding: 50,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    color: navy,
    backgroundColor: '#FFFFFF',
  },
  coverPage: {
    padding: 50,
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: navy,
    height: '100%',
  },
  coverLogo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: green,
    marginBottom: 30,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLogoText: { fontSize: 48, fontWeight: 'bold', color: '#FFFFFF' },
  coverTitle: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  coverSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 50 },
  coverScore: { fontSize: 84, fontWeight: 'bold', color: green, marginBottom: 8 },
  coverScoreLabel: { fontSize: 14, color: '#94A3B8', marginBottom: 50 },
  coverDate: { fontSize: 12, color: '#64748B' },
  coverConfidential: { fontSize: 10, color: '#475569', marginTop: 20, letterSpacing: 4 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: green,
  },
  headerLogo: { fontSize: 12, fontWeight: 'bold', color: green },
  headerTitle: { fontSize: 10, color: gray },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: gray },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: navy, marginBottom: 10 },
  subsectionTitle: { fontSize: 12, fontWeight: 'bold', color: navy, marginBottom: 6, marginTop: 4 },
  body: { fontSize: 10, lineHeight: 1.5, color: '#334155', marginBottom: 8 },
  bodySmall: { fontSize: 9, lineHeight: 1.4, color: '#475569', marginBottom: 6 },
  footNote: { fontSize: 8, color: gray, lineHeight: 1.4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
  gradeBox: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#ECFDF5' },
  gradeText: { fontSize: 12, fontWeight: 'bold', color: green },
  barContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 120, fontSize: 9, color: navy },
  barTrack: { flex: 1, height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, marginHorizontal: 6 },
  barFill: { height: 10, backgroundColor: green, borderRadius: 5 },
  barScore: { width: 40, textAlign: 'right', fontSize: 9, fontWeight: 'bold', color: navy },
  listItem: { flexDirection: 'row', marginBottom: 4 },
  bullet: { width: 4, height: 4, borderRadius: 2, marginRight: 6, marginTop: 4, flexShrink: 0 },
  listText: { fontSize: 9, color: '#334155', flex: 1, lineHeight: 1.4 },
  detailedBulletContainer: { flexDirection: 'row', marginBottom: 6 },
  detailedBulletContent: { flex: 1 },
  detailedBulletPointText: { fontSize: 9.5, fontWeight: 'bold', color: navy, marginBottom: 1 },
  detailedBulletDetail: { fontSize: 8.5, color: '#475569', lineHeight: 1.3 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  swotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  swotQuadrant: { width: '48%', padding: 8, borderRadius: 6, margin: '1%', marginBottom: 6 },
  swotTitle: { fontSize: 10, fontWeight: 'bold', color: navy, marginBottom: 4 },
  riskRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 5 },
  riskRowHeader: { borderBottomWidth: 2, borderBottomColor: '#CBD5E1', backgroundColor: lightGray, paddingHorizontal: 4 },
  riskCellRisk: { flex: 2, fontSize: 8.5, color: '#334155', paddingRight: 4 },
  riskCellSeverity: { width: 55 },
  riskCellMitigation: { flex: 2, fontSize: 8.5, color: '#475569', paddingLeft: 4 },
  headline: { fontSize: 10, color: '#475569', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.4 },
})

const dimensionNames: Record<string, string> = {
  team: 'Team & Founders',
  market: 'Market Opportunity',
  product: 'Product & Technology',
  financial: 'Financial Analysis',
}

function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0)
}

function PageHeader() {
  return React.createElement(View, { style: styles.header },
    React.createElement(Text, { style: styles.headerLogo }, 'Kunfa.AI'),
    React.createElement(Text, { style: styles.headerTitle }, 'Investment Memorandum')
  )
}

function PageFooter({ pageNum }: { pageNum: number }) {
  return React.createElement(View, { style: styles.footer },
    React.createElement(Text, { style: styles.footerText }, 'Kunfa.AI â Confidential Investment Memorandum'),
    React.createElement(Text, { style: styles.footerText }, `Page ${pageNum}`)
  )
}

function renderParagraphs(paragraphs: string[], small = false) {
  return paragraphs.map((p, i) =>
    React.createElement(Text, { key: `p-${i}`, style: small ? styles.bodySmall : styles.body }, p)
  )
}

function BulletItem({ text, color = green }: { text: string; color?: string }) {
  return React.createElement(View, { style: styles.listItem },
    React.createElement(View, { style: { ...styles.bullet, backgroundColor: color } }),
    React.createElement(Text, { style: styles.listText }, text)
  )
}

function DetailedBulletItem({ point, detail, color = green }: { point: string; detail: string; color?: string }) {
  return React.createElement(View, { style: styles.detailedBulletContainer },
    React.createElement(View, { style: { ...styles.bullet, backgroundColor: color } }),
    React.createElement(View, { style: styles.detailedBulletContent },
      React.createElement(Text, { style: styles.detailedBulletPointText }, point),
      React.createElement(Text, { style: styles.detailedBulletDetail }, detail)
    )
  )
}

function ScoreBar({ label, score, maxScore = 25 }: { label: string; score: number; maxScore?: number }) {
  const pct = Math.min((score / maxScore) * 100, 100)
  return React.createElement(View, { style: styles.barContainer },
    React.createElement(Text, { style: styles.barLabel }, label),
    React.createElement(View, { style: styles.barTrack },
      React.createElement(View, { style: { ...styles.barFill, width: `${pct}%` } })
    ),
    React.createElement(Text, { style: styles.barScore }, `${score}/${maxScore}`)
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity.toLowerCase()
  const bg = s.includes('high') ? '#FEE2E2' : s.includes('medium') ? '#FEF3C7' : '#EEF2FF'
  const fg = s.includes('high') ? red : s.includes('medium') ? amber : indigo
  return React.createElement(View, { style: { ...styles.badge, backgroundColor: bg } },
    React.createElement(Text, { style: { fontSize: 7, fontWeight: 'bold', color: fg } }, severity)
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase()
  const bg = p.includes('immediate') ? '#FEE2E2' : p.includes('short') ? '#FEF3C7' : '#EEF2FF'
  const fg = p.includes('immediate') ? red : p.includes('short') ? amber : indigo
  return React.createElement(View, { style: { ...styles.badge, backgroundColor: bg, marginBottom: 0 } },
    React.createElement(Text, { style: { fontSize: 7, fontWeight: 'bold', color: fg } }, priority)
  )
}

// ============================================
// Main PDF Generator â Compact 5-Page Report
// ============================================

export async function generateReport(
  result: ScoringResult,
  memo: ExpandedMemoContent,
  email: string
): Promise<Buffer> {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const overviewParagraphs = splitIntoParagraphs(memo.executive_summary.overview)
  const thesisParagraphs = splitIntoParagraphs(memo.executive_summary.investment_thesis)

  const doc = React.createElement(Document, {},

    // ---- PAGE 1: COVER ----
    React.createElement(Page, { size: 'A4', style: styles.coverPage },
      React.createElement(View, { style: styles.coverLogo },
        React.createElement(Text, { style: styles.coverLogoText }, 'K')
      ),
      React.createElement(Text, { style: styles.coverTitle }, 'INVESTMENT MEMORANDUM'),
      React.createElement(Text, { style: styles.coverSubtitle }, 'AI-Powered Analysis by Kunfa.AI'),
      React.createElement(Text, { style: styles.coverScore }, String(result.overall_score)),
      React.createElement(Text, { style: styles.coverScoreLabel }, 'Kunfa Score / 100'),
      React.createElement(Text, { style: styles.coverDate }, date),
      React.createElement(Text, { style: styles.coverConfidential }, 'CONFIDENTIAL')
    ),

    // ---- PAGE 2: EXECUTIVE SUMMARY + SCORE DASHBOARD ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Executive Summary'),
      React.createElement(View, { style: { ...styles.badge, backgroundColor: '#ECFDF5' } },
        React.createElement(Text, { style: { fontSize: 9, fontWeight: 'bold', color: green } }, result.investment_readiness)
      ),
      ...renderParagraphs(overviewParagraphs),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Investment Thesis'),
      ...renderParagraphs(thesisParagraphs),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Score Dashboard'),
      ...(Object.entries(result.dimensions) as [string, { score: number }][]).map(([key, dim]) =>
        ScoreBar({ label: dimensionNames[key], score: dim.score, maxScore: 25 })
      ),
      React.createElement(View, { style: { marginTop: 6, padding: 10, backgroundColor: lightGray, borderRadius: 6 } },
        React.createElement(Text, { style: { fontSize: 11, fontWeight: 'bold', color: navy, marginBottom: 2 } },
          `Overall: ${result.overall_score}/100`
        ),
        React.createElement(Text, { style: { fontSize: 9, color: gray } },
          `Top ${result.percentile}% of submissions | Sector: ${result.sector_benchmarks.sector}`
        )
      ),
      React.createElement(PageFooter, { pageNum: 2 })
    ),

    // ---- PAGE 3: DIMENSION ANALYSIS (ALL 4) ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Dimension Analysis'),
      ...(['team', 'market', 'product', 'financial'] as const).flatMap((dimKey) => {
        const dim = result.dimensions[dimKey]
        const expanded = memo.dimensions[dimKey]
        const name = dimensionNames[dimKey]
        const paragraphs = splitIntoParagraphs(expanded.detailed_analysis)
        return [
          React.createElement(View, { key: `${dimKey}-header`, style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
            React.createElement(Text, { style: { fontSize: 12, fontWeight: 'bold', color: navy } }, name),
            React.createElement(Text, { style: { fontSize: 11, fontWeight: 'bold', color: green } }, `${dim.score}/25 (${dim.letter_grade})`)
          ),
          ...paragraphs.map((p, i) =>
            React.createElement(Text, { key: `${dimKey}-p-${i}`, style: styles.bodySmall }, p)
          ),
          React.createElement(View, { key: `${dimKey}-div`, style: { ...styles.divider, marginVertical: 6 } }),
        ]
      }),
      React.createElement(PageFooter, { pageNum: 3 })
    ),

    // ---- PAGE 4: SWOT + RISK ASSESSMENT ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'SWOT Analysis'),
      React.createElement(View, { style: styles.swotGrid },
        React.createElement(View, { style: { ...styles.swotQuadrant, backgroundColor: '#ECFDF5', borderLeftWidth: 3, borderLeftColor: green } },
          React.createElement(Text, { style: styles.swotTitle }, 'Strengths'),
          ...memo.swot.strengths.map((item, idx) =>
            BulletItem({ text: item, color: green })
          )
        ),
        React.createElement(View, { style: { ...styles.swotQuadrant, backgroundColor: '#FEE2E2', borderLeftWidth: 3, borderLeftColor: red } },
          React.createElement(Text, { style: styles.swotTitle }, 'Weaknesses'),
          ...memo.swot.weaknesses.map((item, idx) =>
            BulletItem({ text: item, color: red })
          )
        ),
        React.createElement(View, { style: { ...styles.swotQuadrant, backgroundColor: '#EEF2FF', borderLeftWidth: 3, borderLeftColor: indigo } },
          React.createElement(Text, { style: styles.swotTitle }, 'Opportunities'),
          ...memo.swot.opportunities.map((item, idx) =>
            BulletItem({ text: item, color: indigo })
          )
        ),
        React.createElement(View, { style: { ...styles.swotQuadrant, backgroundColor: '#FEF3C7', borderLeftWidth: 3, borderLeftColor: amber } },
          React.createElement(Text, { style: styles.swotTitle }, 'Threats'),
          ...memo.swot.threats.map((item, idx) =>
            BulletItem({ text: item, color: amber })
          )
        )
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.sectionTitle }, 'Risk Assessment'),
      React.createElement(View, { style: { ...styles.riskRow, ...styles.riskRowHeader } },
        React.createElement(Text, { style: { ...styles.riskCellRisk, fontWeight: 'bold', fontSize: 8 } }, 'RISK'),
        React.createElement(Text, { style: { ...styles.riskCellSeverity, fontWeight: 'bold', fontSize: 8 } }, 'SEVERITY'),
        React.createElement(Text, { style: { ...styles.riskCellMitigation, fontWeight: 'bold', fontSize: 8 } }, 'MITIGATION')
      ),
      ...memo.risk_assessment.map((risk, idx) =>
        React.createElement(View, { key: `risk-${idx}`, style: styles.riskRow },
          React.createElement(Text, { style: styles.riskCellRisk }, risk.risk),
          React.createElement(View, { style: styles.riskCellSeverity },
            SeverityBadge({ severity: risk.severity })
          ),
          React.createElement(Text, { style: styles.riskCellMitigation }, risk.mitigation)
        )
      ),
      React.createElement(PageFooter, { pageNum: 4 })
    ),

    // ---- PAGE 5: RECOMMENDATIONS + DISCLAIMER ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Strategic Recommendations'),
      ...memo.strategic_recommendations.map((rec, idx) =>
        React.createElement(View, { key: `rec-${idx}`, style: { marginBottom: 8 } },
          React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 } },
            PriorityBadge({ priority: rec.priority }),
            React.createElement(Text, { style: { fontSize: 10, fontWeight: 'bold', color: navy, flex: 1 } }, rec.recommendation)
          ),
          React.createElement(Text, { style: styles.bodySmall }, rec.detail)
        )
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Fundraising Readiness'),
      React.createElement(Text, { style: styles.bodySmall }, memo.fundraising_readiness.current_status),
      ...memo.fundraising_readiness.next_steps.map((step, idx) =>
        BulletItem({ text: step, color: green })
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: { fontSize: 9, fontWeight: 'bold', color: navy, marginBottom: 4 } }, 'Disclaimer'),
      React.createElement(Text, { style: styles.footNote },
        'This report is generated by artificial intelligence and is provided for informational purposes only. It does not constitute investment advice, financial advice, or a recommendation to invest. Kunfa.AI makes no guarantees regarding the accuracy, completeness, or reliability of this analysis. Investment decisions should always be made with the guidance of qualified financial professionals.'
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: { textAlign: 'center', fontSize: 8, color: gray, marginTop: 10 } },
        `Report generated for ${email} on ${date}`
      ),
      React.createElement(Text, { style: { textAlign: 'center', fontSize: 9, color: green, marginTop: 6, fontWeight: 'bold' } },
        'Kunfa.AI â A Vitality Capital Platform'
      ),
      React.createElement(PageFooter, { pageNum: 5 })
    )
  )

  const buffer = await renderToBuffer(doc)
  return Buffer.from(buffer)
}
