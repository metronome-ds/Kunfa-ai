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
    marginBottom: 24,
    paddingBottom: 10,
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
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: navy, marginBottom: 16 },
  subsectionTitle: { fontSize: 13, fontWeight: 'bold', color: navy, marginBottom: 8, marginTop: 6 },
  body: { fontSize: 10.5, lineHeight: 1.6, color: '#334155', marginBottom: 10 },
  bodySmall: { fontSize: 9.5, lineHeight: 1.5, color: '#475569', marginBottom: 8 },
  footNote: { fontSize: 8, color: gray, lineHeight: 1.4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 10 },
  gradeBox: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#ECFDF5' },
  gradeText: { fontSize: 14, fontWeight: 'bold', color: green },
  barContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barLabel: { width: 130, fontSize: 10, color: navy },
  barTrack: { flex: 1, height: 12, backgroundColor: '#E2E8F0', borderRadius: 6, marginHorizontal: 8 },
  barFill: { height: 12, backgroundColor: green, borderRadius: 6 },
  barScore: { width: 45, textAlign: 'right', fontSize: 10, fontWeight: 'bold', color: navy },
  listItem: { flexDirection: 'row', marginBottom: 6 },
  bullet: { width: 5, height: 5, borderRadius: 3, marginRight: 8, marginTop: 5, flexShrink: 0 },
  listText: { fontSize: 10, color: '#334155', flex: 1, lineHeight: 1.5 },
  detailedBulletContainer: { flexDirection: 'row', marginBottom: 10 },
  detailedBulletContent: { flex: 1 },
  detailedBulletPointText: { fontSize: 10.5, fontWeight: 'bold', color: navy, marginBottom: 2 },
  detailedBulletDetail: { fontSize: 9.5, color: '#475569', lineHeight: 1.4 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  swotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  swotQuadrant: { width: '48%', padding: 12, borderRadius: 8, margin: '1%', marginBottom: 8 },
  swotTitle: { fontSize: 11, fontWeight: 'bold', color: navy, marginBottom: 6 },
  riskRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 8 },
  riskRowHeader: { borderBottomWidth: 2, borderBottomColor: '#CBD5E1', backgroundColor: lightGray, paddingHorizontal: 4 },
  riskCellRisk: { flex: 2, fontSize: 9.5, color: '#334155', paddingRight: 6 },
  riskCellSeverity: { width: 65 },
  riskCellMitigation: { flex: 2, fontSize: 9.5, color: '#475569', paddingLeft: 6 },
  tocItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingVertical: 2 },
  tocItemNumber: { fontWeight: 'bold', color: navy, marginRight: 8, fontSize: 10.5 },
  tocItemTitle: { flex: 1, color: navy, fontSize: 10.5 },
  tocItemPage: { textAlign: 'right', minWidth: 25, fontSize: 10.5, color: gray },
  headline: { fontSize: 11, color: '#475569', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5 },
})

const dimensionNames: Record<string, string> = {
  team: 'Team & Founders',
  market: 'Market Opportunity',
  product: 'Product & Technology',
  financial: 'Financial Analysis',
}

// ============================================
// Helper Functions
// ============================================

function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0)
}

function splitParagraphsForPages(text: string): [string[], string[]] {
  const paragraphs = splitIntoParagraphs(text)
  if (paragraphs.length <= 1) return [paragraphs, []]
  const mid = Math.ceil(paragraphs.length / 2)
  return [paragraphs.slice(0, mid), paragraphs.slice(mid)]
}

// ============================================
// Helper Components
// ============================================

function PageHeader() {
  return React.createElement(View, { style: styles.header },
    React.createElement(Text, { style: styles.headerLogo }, 'Kunfa.AI'),
    React.createElement(Text, { style: styles.headerTitle }, 'Investment Memorandum')
  )
}

function PageFooter({ pageNum }: { pageNum: number }) {
  return React.createElement(View, { style: styles.footer },
    React.createElement(Text, { style: styles.footerText }, 'Kunfa.AI — Confidential Investment Memorandum'),
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
    React.createElement(Text, { style: { fontSize: 8, fontWeight: 'bold', color: fg } }, severity)
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase()
  const bg = p.includes('immediate') ? '#FEE2E2' : p.includes('short') ? '#FEF3C7' : '#EEF2FF'
  const fg = p.includes('immediate') ? red : p.includes('short') ? amber : indigo
  return React.createElement(View, { style: { ...styles.badge, backgroundColor: bg, marginBottom: 0 } },
    React.createElement(Text, { style: { fontSize: 8, fontWeight: 'bold', color: fg } }, priority)
  )
}

function DimensionPages({
  dimKey,
  result,
  memo,
  startPage,
}: {
  dimKey: string
  result: ScoringResult
  memo: ExpandedMemoContent
  startPage: number
}) {
  const dim = result.dimensions[dimKey as keyof typeof result.dimensions]
  const expanded = memo.dimensions[dimKey as keyof typeof memo.dimensions]
  const name = dimensionNames[dimKey] || dimKey
  const [firstParagraphs, secondParagraphs] = splitParagraphsForPages(expanded.detailed_analysis)

  return [
    // Page 1: Title + first half of analysis
    React.createElement(Page, { key: `${dimKey}-1`, size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
        React.createElement(Text, { style: styles.sectionTitle }, name),
        React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 8 } },
          React.createElement(View, { style: styles.gradeBox },
            React.createElement(Text, { style: styles.gradeText }, dim.letter_grade)
          ),
          React.createElement(Text, { style: { fontSize: 14, fontWeight: 'bold', color: green } }, `${dim.score}/25`)
        )
      ),
      React.createElement(Text, { style: styles.headline }, dim.headline),
      ...renderParagraphs(firstParagraphs),
      React.createElement(PageFooter, { pageNum: startPage })
    ),
    // Page 2: Remaining analysis + Strengths/Risks/Recommendations
    React.createElement(Page, { key: `${dimKey}-2`, size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      ...(secondParagraphs.length > 0 ? [
        ...renderParagraphs(secondParagraphs),
        React.createElement(View, { key: `${dimKey}-div1`, style: styles.divider }),
      ] : []),
      React.createElement(Text, { key: `${dimKey}-st`, style: styles.subsectionTitle }, 'Strengths'),
      ...expanded.strengths.map((item, idx) =>
        DetailedBulletItem({ point: item.point, detail: item.detail, color: green })
      ),
      React.createElement(View, { key: `${dimKey}-div2`, style: styles.divider }),
      React.createElement(Text, { key: `${dimKey}-rt`, style: styles.subsectionTitle }, 'Risks'),
      ...expanded.risks.map((item, idx) =>
        DetailedBulletItem({ point: item.point, detail: item.detail, color: red })
      ),
      React.createElement(View, { key: `${dimKey}-div3`, style: styles.divider }),
      React.createElement(Text, { key: `${dimKey}-rect`, style: styles.subsectionTitle }, 'Recommendations'),
      ...expanded.recommendations.map((item, idx) =>
        DetailedBulletItem({ point: item.point, detail: item.detail, color: indigo })
      ),
      React.createElement(PageFooter, { pageNum: startPage + 1 })
    ),
  ]
}

// ============================================
// Main PDF Generator
// ============================================

export async function generateReport(
  result: ScoringResult,
  memo: ExpandedMemoContent,
  email: string
): Promise<Buffer> {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const tocEntries = [
    { title: 'Executive Summary', page: '3' },
    { title: 'Key Findings & Score Dashboard', page: '4' },
    { title: 'Company Overview', page: '5' },
    { title: 'Team & Founders Deep Dive', page: '6-7' },
    { title: 'Market Opportunity Deep Dive', page: '8-9' },
    { title: 'Product & Technology Deep Dive', page: '10-11' },
    { title: 'Financial Analysis Deep Dive', page: '12-13' },
    { title: 'SWOT Analysis', page: '14' },
    { title: 'Risk Assessment', page: '15' },
    { title: 'Strategic Recommendations & Fundraising', page: '16' },
    { title: 'Methodology & Disclaimers', page: '17' },
  ]

  const overviewParagraphs = splitIntoParagraphs(memo.executive_summary.overview)
  const thesisParagraphs = splitIntoParagraphs(memo.executive_summary.investment_thesis)
  const findingsParagraphs = splitIntoParagraphs(memo.executive_summary.key_findings)
  const compDescParagraphs = splitIntoParagraphs(memo.company_overview.description)
  const compModelParagraphs = splitIntoParagraphs(memo.company_overview.business_model)
  const compMarketParagraphs = splitIntoParagraphs(memo.company_overview.target_market)

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

    // ---- PAGE 2: TABLE OF CONTENTS ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Table of Contents'),
      React.createElement(View, { style: styles.divider }),
      ...tocEntries.map((item, idx) =>
        React.createElement(View, { key: `toc-${idx}`, style: styles.tocItem },
          React.createElement(View, { style: { flexDirection: 'row', flex: 1 } },
            React.createElement(Text, { style: styles.tocItemNumber }, `${idx + 1}.`),
            React.createElement(Text, { style: styles.tocItemTitle }, item.title)
          ),
          React.createElement(Text, { style: styles.tocItemPage }, item.page)
        )
      ),
      React.createElement(PageFooter, { pageNum: 2 })
    ),

    // ---- PAGE 3: EXECUTIVE SUMMARY ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Executive Summary'),
      React.createElement(View, { style: { ...styles.badge, backgroundColor: '#ECFDF5' } },
        React.createElement(Text, { style: { fontSize: 10, fontWeight: 'bold', color: green } }, result.investment_readiness)
      ),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Overview'),
      ...renderParagraphs(overviewParagraphs),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Investment Thesis'),
      ...renderParagraphs(thesisParagraphs),
      React.createElement(PageFooter, { pageNum: 3 })
    ),

    // ---- PAGE 4: KEY FINDINGS & SCORE DASHBOARD ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Key Findings & Score Dashboard'),
      ...renderParagraphs(findingsParagraphs),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Dimension Scores'),
      ...(Object.entries(result.dimensions) as [string, { score: number }][]).map(([key, dim]) =>
        ScoreBar({ label: dimensionNames[key], score: dim.score, maxScore: 25 })
      ),
      React.createElement(View, { style: { marginTop: 8, padding: 12, backgroundColor: lightGray, borderRadius: 8 } },
        React.createElement(Text, { style: { fontSize: 12, fontWeight: 'bold', color: navy, marginBottom: 4 } },
          `Overall: ${result.overall_score}/100`
        ),
        React.createElement(Text, { style: { fontSize: 10, color: gray } },
          `Top ${result.percentile}% of submissions`
        )
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Sector Benchmarks'),
      React.createElement(Text, { style: styles.bodySmall }, `Sector: ${result.sector_benchmarks.sector}`),
      React.createElement(Text, { style: styles.bodySmall }, `Average Score: ${result.sector_benchmarks.avg_score}/100`),
      React.createElement(Text, { style: styles.bodySmall }, result.sector_benchmarks.comparison),
      React.createElement(PageFooter, { pageNum: 4 })
    ),

    // ---- PAGE 5: COMPANY OVERVIEW ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Company Overview'),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Description'),
      ...renderParagraphs(compDescParagraphs),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Business Model'),
      ...renderParagraphs(compModelParagraphs),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Target Market'),
      ...renderParagraphs(compMarketParagraphs),
      React.createElement(PageFooter, { pageNum: 5 })
    ),

    // ---- PAGES 6-13: DIMENSION DEEP DIVES ----
    ...DimensionPages({ dimKey: 'team', result, memo, startPage: 6 }),
    ...DimensionPages({ dimKey: 'market', result, memo, startPage: 8 }),
    ...DimensionPages({ dimKey: 'product', result, memo, startPage: 10 }),
    ...DimensionPages({ dimKey: 'financial', result, memo, startPage: 12 }),

    // ---- PAGE 14: SWOT ANALYSIS ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'SWOT Analysis'),
      React.createElement(View, { style: styles.swotGrid },
        // Strengths
        React.createElement(View, { style: { ...styles.swotQuadrant, backgroundColor: '#ECFDF5', borderLeftWidth: 4, borderLeftColor: green } },
          React.createElement(Text, { style: styles.swotTitle }, 'Strengths'),
          ...memo.swot.strengths.map((item, idx) =>
            BulletItem({ text: item, color: green })
          )
        ),
        // Weaknesses
        React.createElement(View, { style: { ...styles.swotQuadrant, backgroundColor: '#FEE2E2', borderLeftWidth: 4, borderLeftColor: red } },
          React.createElement(Text, { style: styles.swotTitle }, 'Weaknesses'),
          ...memo.swot.weaknesses.map((item, idx) =>
            BulletItem({ text: item, color: red })
          )
        ),
        // Opportunities
        React.createElement(View, { style: { ...styles.swotQuadrant, backgroundColor: '#EEF2FF', borderLeftWidth: 4, borderLeftColor: indigo } },
          React.createElement(Text, { style: styles.swotTitle }, 'Opportunities'),
          ...memo.swot.opportunities.map((item, idx) =>
            BulletItem({ text: item, color: indigo })
          )
        ),
        // Threats
        React.createElement(View, { style: { ...styles.swotQuadrant, backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: amber } },
          React.createElement(Text, { style: styles.swotTitle }, 'Threats'),
          ...memo.swot.threats.map((item, idx) =>
            BulletItem({ text: item, color: amber })
          )
        )
      ),
      React.createElement(PageFooter, { pageNum: 14 })
    ),

    // ---- PAGE 15: RISK ASSESSMENT ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Risk Assessment'),
      React.createElement(Text, { style: styles.body }, 'The following risks have been identified through our analysis and should be carefully monitored.'),
      // Header row
      React.createElement(View, { style: { ...styles.riskRow, ...styles.riskRowHeader } },
        React.createElement(Text, { style: { ...styles.riskCellRisk, fontWeight: 'bold', fontSize: 9 } }, 'RISK'),
        React.createElement(Text, { style: { ...styles.riskCellSeverity, fontWeight: 'bold', fontSize: 9 } }, 'SEVERITY'),
        React.createElement(Text, { style: { ...styles.riskCellMitigation, fontWeight: 'bold', fontSize: 9 } }, 'MITIGATION')
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
      React.createElement(PageFooter, { pageNum: 15 })
    ),

    // ---- PAGE 16: STRATEGIC RECOMMENDATIONS & FUNDRAISING ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Strategic Recommendations'),
      ...memo.strategic_recommendations.map((rec, idx) =>
        React.createElement(View, { key: `rec-${idx}`, style: { marginBottom: 12 } },
          React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 } },
            PriorityBadge({ priority: rec.priority }),
            React.createElement(Text, { style: { fontSize: 11, fontWeight: 'bold', color: navy, flex: 1 } }, rec.recommendation)
          ),
          React.createElement(Text, { style: styles.bodySmall }, rec.detail)
        )
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Fundraising Readiness'),
      React.createElement(Text, { style: styles.body }, memo.fundraising_readiness.current_status),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Next Steps'),
      ...memo.fundraising_readiness.next_steps.map((step, idx) =>
        BulletItem({ text: step, color: green })
      ),
      React.createElement(Text, { style: { ...styles.subsectionTitle, marginTop: 8 } }, 'Timeline'),
      React.createElement(Text, { style: styles.bodySmall }, memo.fundraising_readiness.timeline),
      React.createElement(PageFooter, { pageNum: 16 })
    ),

    // ---- PAGE 17: METHODOLOGY & DISCLAIMERS ----
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(PageHeader, null),
      React.createElement(Text, { style: styles.sectionTitle }, 'Methodology & Disclaimers'),
      React.createElement(Text, { style: styles.subsectionTitle }, 'How Kunfa Scoring Works'),
      React.createElement(Text, { style: styles.body },
        'The Kunfa Score is generated by our proprietary AI engine, which analyzes startup materials across four key dimensions: Team & Founders, Market Opportunity, Product & Technology, and Financial Analysis. Each dimension is scored out of 25 points for a maximum of 100.'
      ),
      React.createElement(Text, { style: styles.body },
        'Our AI has been trained on thousands of successful and unsuccessful startup pitches and company analyses, allowing it to identify patterns correlated with fundraising success, investor interest, and long-term viability.'
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Scoring Scale'),
      React.createElement(Text, { style: styles.bodySmall }, '90-100: Exceptional — Investment ready, strong across all dimensions'),
      React.createElement(Text, { style: styles.bodySmall }, '75-89: Strong — Well-positioned with minor areas for improvement'),
      React.createElement(Text, { style: styles.bodySmall }, '60-74: Promising — Good foundation but needs work in key areas'),
      React.createElement(Text, { style: styles.bodySmall }, '40-59: Developing — Significant improvements needed before fundraising'),
      React.createElement(Text, { style: styles.bodySmall }, 'Below 40: Early Stage — Fundamental elements need to be addressed'),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.subsectionTitle }, 'Disclaimer'),
      React.createElement(Text, { style: styles.footNote },
        'This report is generated by artificial intelligence and is provided for informational purposes only. It does not constitute investment advice, financial advice, or a recommendation to invest. Kunfa.AI and its partners make no guarantees regarding the accuracy, completeness, or reliability of this analysis. Investment decisions should always be made with the guidance of qualified financial professionals and thorough due diligence.'
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: { textAlign: 'center', fontSize: 9, color: gray, marginTop: 20 } },
        `Report generated for ${email} on ${date}`
      ),
      React.createElement(Text, { style: { textAlign: 'center', fontSize: 10, color: green, marginTop: 8, fontWeight: 'bold' } },
        'Kunfa.AI — A Vitality Capital Platform'
      ),
      React.createElement(PageFooter, { pageNum: 17 })
    )
  )

  const buffer = await renderToBuffer(doc)
  return Buffer.from(buffer)
}
