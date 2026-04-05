import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { isSuperAdmin } from '@/lib/super-admins'

export const dynamic = 'force-dynamic'

interface CountsByKey {
  [key: string]: number
}

interface DailyPoint {
  date: string
  investors: number
  startups: number
  total: number
}

interface ScorePoint {
  date: string
  count: number
  avg: number
}

interface MostViewedCompany {
  company_id: string
  company_name: string
  slug: string | null
  views: number
}

interface RecentViewer {
  viewer_email: string
  company_name: string
  slug: string | null
  created_at: string
}

interface ActivityItem {
  id: string
  type: 'signup' | 'score' | 'upload' | 'pipeline' | 'team_invite' | 'claim'
  actor: string
  description: string
  created_at: string
}

// --- Helpers ---
function dayKey(iso: string): string {
  return iso.slice(0, 10) // YYYY-MM-DD
}

function lastNDays(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export async function GET() {
  // --- Auth ---
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getSupabase()
  const now = new Date()
  const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // --- Profiles ---
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, role, created_at')
    if (profilesErr) throw profilesErr

    const totalUsers = profiles?.length ?? 0
    const roleCounts: CountsByKey = {}
    for (const p of profiles ?? []) {
      const r = (p.role || 'unknown').toLowerCase()
      const bucket = r === 'founder' || r === 'startup' ? 'startup' : r === 'investor' ? 'investor' : r
      roleCounts[bucket] = (roleCounts[bucket] ?? 0) + 1
    }

    // Build user_id → profile lookup for activity feed
    const profileByUserId = new Map<string, { email: string; full_name: string | null; role: string | null }>()
    for (const p of profiles ?? []) {
      if (p.user_id) {
        profileByUserId.set(p.user_id, { email: p.email || '', full_name: p.full_name, role: p.role })
      }
    }

    // Signups per day (last 30 days), split by role
    const signupBuckets = new Map<string, { investors: number; startups: number }>()
    for (const day of lastNDays(30)) {
      signupBuckets.set(day, { investors: 0, startups: 0 })
    }
    for (const p of profiles ?? []) {
      if (!p.created_at) continue
      const key = dayKey(p.created_at)
      const bucket = signupBuckets.get(key)
      if (!bucket) continue
      const r = (p.role || '').toLowerCase()
      if (r === 'founder' || r === 'startup') bucket.startups++
      else bucket.investors++
    }
    const signupsOverTime: DailyPoint[] = lastNDays(30).map(date => {
      const b = signupBuckets.get(date)!
      return { date, investors: b.investors, startups: b.startups, total: b.investors + b.startups }
    })

    // --- Companies ---
    const { data: companies, error: companiesErr } = await supabase
      .from('company_pages')
      .select('id, company_name, slug, overall_score, source, created_at, claim_status, added_by')
    if (companiesErr) throw companiesErr

    const totalCompanies = companies?.length ?? 0
    let scoredCount = 0
    let unscoredCount = 0
    let scoreSum = 0
    let highScoreCount = 0
    const sourceCounts: CountsByKey = {}
    for (const c of companies ?? []) {
      if (c.overall_score && c.overall_score > 0) {
        scoredCount++
        scoreSum += c.overall_score
        if (c.overall_score >= 75) highScoreCount++
      } else {
        unscoredCount++
      }
      const src = (c.source || 'unknown').toLowerCase()
      sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
    }
    const avgCompanyScore = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : 0

    const companyById = new Map<string, { name: string; slug: string | null }>()
    for (const c of companies ?? []) {
      companyById.set(c.id, { name: c.company_name, slug: c.slug })
    }

    // --- Document access log ---
    const { data: accessLogs, error: accessErr } = await supabase
      .from('document_access_log')
      .select('id, company_id, viewer_email, created_at')
      .order('created_at', { ascending: false })
    if (accessErr) throw accessErr

    const viewsAllTime = accessLogs?.length ?? 0
    let views7d = 0
    let views30d = 0
    const uniqueEmails = new Set<string>()
    const viewsByCompany = new Map<string, number>()
    for (const log of accessLogs ?? []) {
      if (log.created_at && log.created_at >= days7Ago) views7d++
      if (log.created_at && log.created_at >= days30Ago) views30d++
      if (log.viewer_email) uniqueEmails.add(log.viewer_email.toLowerCase())
      if (log.company_id) {
        viewsByCompany.set(log.company_id, (viewsByCompany.get(log.company_id) ?? 0) + 1)
      }
    }

    const mostViewedCompanies: MostViewedCompany[] = Array.from(viewsByCompany.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([company_id, views]) => {
        const c = companyById.get(company_id)
        return {
          company_id,
          company_name: c?.name || 'Unknown company',
          slug: c?.slug ?? null,
          views,
        }
      })

    const recentViewers: RecentViewer[] = (accessLogs ?? [])
      .filter(l => l.viewer_email)
      .slice(0, 20)
      .map(log => {
        const c = log.company_id ? companyById.get(log.company_id) : null
        return {
          viewer_email: log.viewer_email!,
          company_name: c?.name || 'Unknown',
          slug: c?.slug ?? null,
          created_at: log.created_at,
        }
      })

    // --- Dealroom documents ---
    const { data: docs, error: docsErr } = await supabase
      .from('dealroom_documents')
      .select('id, category, created_at')
    if (docsErr) throw docsErr

    const totalDocuments = docs?.length ?? 0
    const documentsByCategory: CountsByKey = {}
    for (const d of docs ?? []) {
      const cat = (d.category || 'other').toLowerCase()
      documentsByCategory[cat] = (documentsByCategory[cat] ?? 0) + 1
    }

    // --- Submissions (scores) ---
    const { data: submissions, error: subsErr } = await supabase
      .from('submissions')
      .select('id, user_id, email, company_name, overall_score, created_at')
      .order('created_at', { ascending: false })
    if (subsErr) throw subsErr

    const totalScores = submissions?.length ?? 0
    let subScoreSum = 0
    let scoredSubCount = 0
    for (const s of submissions ?? []) {
      if (s.overall_score && s.overall_score > 0) {
        subScoreSum += s.overall_score
        scoredSubCount++
      }
    }
    const avgSubmissionScore = scoredSubCount > 0 ? Math.round(subScoreSum / scoredSubCount) : 0

    const scoreBuckets = new Map<string, { count: number; sum: number }>()
    for (const day of lastNDays(30)) {
      scoreBuckets.set(day, { count: 0, sum: 0 })
    }
    for (const s of submissions ?? []) {
      if (!s.created_at) continue
      const key = dayKey(s.created_at)
      const b = scoreBuckets.get(key)
      if (!b) continue
      b.count++
      if (s.overall_score) b.sum += s.overall_score
    }
    const scoresOverTime: ScorePoint[] = lastNDays(30).map(date => {
      const b = scoreBuckets.get(date)!
      return { date, count: b.count, avg: b.count > 0 ? Math.round(b.sum / b.count) : 0 }
    })

    // --- Team members ---
    const { data: teamMembers, error: teamErr } = await supabase
      .from('team_members')
      .select('id, status, created_at, invited_by, invited_email')
    if (teamErr) throw teamErr

    const totalInvites = teamMembers?.length ?? 0
    let acceptedInvites = 0
    let pendingInvites = 0
    for (const t of teamMembers ?? []) {
      const s = (t.status || '').toLowerCase()
      if (s === 'active' || s === 'accepted') acceptedInvites++
      else if (s === 'pending' || s === 'invited') pendingInvites++
    }

    // --- Company imports ---
    const { data: imports, error: importsErr } = await supabase
      .from('company_imports')
      .select('id, status')
    if (importsErr) throw importsErr

    const importsTotal = imports?.length ?? 0
    const importsByStatus: CountsByKey = { raw: 0, cleaned: 0, promoted: 0, rejected: 0, duplicate: 0 }
    for (const i of imports ?? []) {
      const s = (i.status || 'raw').toLowerCase()
      importsByStatus[s] = (importsByStatus[s] ?? 0) + 1
    }

    // --- Claim requests (for activity feed) ---
    const { data: claimRequests } = await supabase
      .from('claim_requests')
      .select('id, requester_email, requester_name, company_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    // --- Deals (for pipeline activity feed) ---
    const { data: recentDeals } = await supabase
      .from('deals')
      .select('id, company_id, stage, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    // --- Recent activity feed: union last 20 across tables, sorted by created_at desc ---
    const activity: ActivityItem[] = []

    for (const p of (profiles ?? []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 20)) {
      if (!p.created_at) continue
      activity.push({
        id: `signup-${p.user_id}`,
        type: 'signup',
        actor: p.full_name || p.email || 'A new user',
        description: `joined as ${(p.role || 'user').toLowerCase() === 'founder' ? 'startup' : (p.role || 'user').toLowerCase()}`,
        created_at: p.created_at,
      })
    }

    for (const s of (submissions ?? []).slice(0, 20)) {
      if (!s.created_at) continue
      const actor = s.user_id ? profileByUserId.get(s.user_id) : null
      activity.push({
        id: `score-${s.id}`,
        type: 'score',
        actor: actor?.full_name || actor?.email || s.email || 'Someone',
        description: s.company_name
          ? `scored ${s.company_name}${s.overall_score ? ` (${s.overall_score})` : ''}`
          : `generated a new score${s.overall_score ? ` (${s.overall_score})` : ''}`,
        created_at: s.created_at,
      })
    }

    for (const d of (docs ?? []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 20)) {
      if (!d.created_at) continue
      activity.push({
        id: `upload-${d.id}`,
        type: 'upload',
        actor: 'A user',
        description: `uploaded a ${(d.category || 'document').replace(/_/g, ' ')}`,
        created_at: d.created_at,
      })
    }

    for (const deal of recentDeals ?? []) {
      if (!deal.created_at) continue
      const actor = deal.created_by ? profileByUserId.get(deal.created_by) : null
      const c = deal.company_id ? companyById.get(deal.company_id) : null
      activity.push({
        id: `pipeline-${deal.id}`,
        type: 'pipeline',
        actor: actor?.full_name || actor?.email || 'Someone',
        description: `added ${c?.name || 'a company'} to ${deal.stage || 'pipeline'}`,
        created_at: deal.created_at,
      })
    }

    for (const t of (teamMembers ?? []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 20)) {
      if (!t.created_at) continue
      const actor = t.invited_by ? profileByUserId.get(t.invited_by) : null
      activity.push({
        id: `team-${t.id}`,
        type: 'team_invite',
        actor: actor?.full_name || actor?.email || 'Someone',
        description: `invited ${t.invited_email || 'a teammate'}`,
        created_at: t.created_at,
      })
    }

    for (const cr of claimRequests ?? []) {
      if (!cr.created_at) continue
      const c = cr.company_id ? companyById.get(cr.company_id) : null
      activity.push({
        id: `claim-${cr.id}`,
        type: 'claim',
        actor: cr.requester_name || cr.requester_email || 'Someone',
        description: `submitted a claim for ${c?.name || 'a company'}`,
        created_at: cr.created_at,
      })
    }

    activity.sort((a, b) => b.created_at.localeCompare(a.created_at))
    const recentActivity = activity.slice(0, 20)

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      users: {
        total: totalUsers,
        byRole: roleCounts,
        signupsOverTime,
      },
      companies: {
        total: totalCompanies,
        scored: scoredCount,
        unscored: unscoredCount,
        highScore: highScoreCount,
        avgScore: avgCompanyScore,
        bySource: sourceCounts,
      },
      dealRoom: {
        views7d,
        views30d,
        viewsAllTime,
        uniqueViewers: uniqueEmails.size,
        mostViewedCompanies,
        recentViewers,
      },
      documents: {
        total: totalDocuments,
        byCategory: documentsByCategory,
      },
      scores: {
        total: totalScores,
        avg: avgSubmissionScore,
        scoresOverTime,
      },
      team: {
        totalInvites,
        accepted: acceptedInvites,
        pending: pendingInvites,
      },
      imports: {
        total: importsTotal,
        byStatus: importsByStatus,
      },
      recentActivity,
    })
  } catch (err) {
    console.error('Admin analytics error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: (err as Error).message },
      { status: 500 },
    )
  }
}
