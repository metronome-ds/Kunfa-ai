import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface AccessLogRow {
  id: string
  viewer_email: string
  viewer_user_id: string | null
  document_id: string | null
  access_type: string
  created_at: string
}

interface RecentViewer {
  email: string
  name: string | null
  fundName: string | null
  firstSeen: string
  lastSeen: string
  documentsViewed: { id: string; name: string }[]
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId || !UUID_REGEX.test(companyId)) {
      return NextResponse.json({ error: 'Valid companyId is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Verify ownership
    const { data: company, error: companyError } = await supabase
      .from('company_pages')
      .select('id, user_id, added_by, company_name')
      .eq('id', companyId)
      .maybeSingle()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const isOwner = company.user_id === user.id || company.added_by === user.id
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all logs for this company
    const { data: logs, error: logsError } = await supabase
      .from('document_access_log')
      .select('id, viewer_email, viewer_user_id, document_id, access_type, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (logsError) {
      console.error('[dealroom/analytics] Logs fetch failed:', logsError.message)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    const allLogs = (logs || []) as AccessLogRow[]

    // Filter out the owner's own views (by email or user_id)
    const ownerEmail = user.email?.toLowerCase() || ''
    const filtered = allLogs.filter(
      (l) => l.viewer_email !== ownerEmail && l.viewer_user_id !== user.id
    )

    const now = Date.now()
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000

    // Unique viewer emails (all time + this week)
    const uniqueEmailsAllTime = new Set(filtered.map((l) => l.viewer_email))
    const uniqueEmailsThisWeek = new Set(
      filtered
        .filter((l) => new Date(l.created_at).getTime() >= oneWeekAgo)
        .map((l) => l.viewer_email)
    )

    // Document views (count 'document_view' + 'document_download')
    const docViewLogs = filtered.filter(
      (l) => l.access_type === 'document_view' || l.access_type === 'document_download'
    )
    const docViewsAllTime = docViewLogs.length
    const docViewsThisWeek = docViewLogs.filter(
      (l) => new Date(l.created_at).getTime() >= oneWeekAgo
    ).length

    // 14-day chart — count unlock + document_view events per day
    const trackedLogs = filtered.filter(
      (l) =>
        l.access_type === 'dealroom_unlock' ||
        l.access_type === 'document_view' ||
        l.access_type === 'document_download'
    )

    const chartData: { date: string; views: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now - i * 24 * 60 * 60 * 1000)
      day.setHours(0, 0, 0, 0)
      const dayStart = day.getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000
      const count = trackedLogs.filter((l) => {
        const t = new Date(l.created_at).getTime()
        return t >= dayStart && t < dayEnd
      }).length
      chartData.push({
        date: day.toISOString().slice(0, 10),
        views: count,
      })
    }

    // Recent viewers — group by email, enrich with profile info if Kunfa user, and which docs they viewed
    const recentCutoff = fourteenDaysAgo
    const recentLogs = filtered.filter(
      (l) => new Date(l.created_at).getTime() >= recentCutoff
    )

    // Group by email
    const byEmail = new Map<string, AccessLogRow[]>()
    for (const log of recentLogs) {
      const key = log.viewer_email
      if (!byEmail.has(key)) byEmail.set(key, [])
      byEmail.get(key)!.push(log)
    }

    // Collect unique document_ids to look up names
    const docIds = Array.from(
      new Set(
        recentLogs
          .map((l) => l.document_id)
          .filter((id): id is string => !!id && UUID_REGEX.test(id))
      )
    )
    let docNames: Record<string, string> = {}
    if (docIds.length > 0) {
      const { data: docs } = await supabase
        .from('dealroom_documents')
        .select('id, file_name')
        .in('id', docIds)
      if (docs) {
        docNames = Object.fromEntries(docs.map((d) => [d.id, d.file_name]))
      }
    }

    // Collect user_ids for profile enrichment
    const userIds = Array.from(
      new Set(
        recentLogs
          .map((l) => l.viewer_user_id)
          .filter((id): id is string => !!id && UUID_REGEX.test(id))
      )
    )
    let profileMap: Record<string, { full_name: string | null; fund_name: string | null }> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, fund_name')
        .in('user_id', userIds)
      if (profiles) {
        profileMap = Object.fromEntries(
          profiles.map((p) => [
            p.user_id,
            { full_name: p.full_name, fund_name: p.fund_name },
          ])
        )
      }
    }

    const recentViewers: RecentViewer[] = Array.from(byEmail.entries())
      .map(([email, entries]) => {
        const sorted = [...entries].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        const firstSeen = sorted[0].created_at
        const lastSeen = sorted[sorted.length - 1].created_at

        // Docs viewed by this viewer
        const docs = Array.from(
          new Set(
            sorted
              .filter((e) => e.document_id)
              .map((e) => e.document_id!)
          )
        ).map((id) => ({ id, name: docNames[id] || 'Unknown document' }))

        // Try to get name/fund from the latest log that has a viewer_user_id
        const linkedUserId = sorted.reverse().find((e) => e.viewer_user_id)?.viewer_user_id
        const profile = linkedUserId ? profileMap[linkedUserId] : null

        return {
          email,
          name: profile?.full_name || null,
          fundName: profile?.fund_name || null,
          firstSeen,
          lastSeen,
          documentsViewed: docs,
        }
      })
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())

    return NextResponse.json({
      stats: {
        uniqueViewersThisWeek: uniqueEmailsThisWeek.size,
        uniqueViewersAllTime: uniqueEmailsAllTime.size,
        documentViewsThisWeek: docViewsThisWeek,
        documentViewsAllTime: docViewsAllTime,
      },
      chart: chartData,
      recentViewers,
    })
  } catch (error) {
    console.error('[dealroom/analytics] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
