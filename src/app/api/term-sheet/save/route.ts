import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase-server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface ClauseAnalysis {
  name: string
  rating: string
  extracted_text: string
  explanation: string
  market_comparison: string
}

interface TermSheetAnalysisResult {
  overall_rating: string
  clauses: ClauseAnalysis[]
  summary: string
  stats: {
    total_clauses: number
    founder_friendly: number
    standard: number
    needs_attention: number
  }
}

function generateMarkdown(analysis: TermSheetAnalysisResult, fileName: string): string {
  const ratingLabel: Record<string, string> = {
    founder_friendly: 'Founder-Friendly',
    standard: 'Standard Terms',
    needs_attention: 'Proceed with Caution',
  }

  const ratingEmoji: Record<string, string> = {
    founder_friendly: '🟢',
    standard: '🟡',
    needs_attention: '🔴',
  }

  let md = `# Term Sheet Analysis\n\n`
  md += `**Source:** ${fileName}\n`
  md += `**Date:** ${new Date().toLocaleDateString()}\n`
  md += `**Overall Rating:** ${ratingEmoji[analysis.overall_rating] || '⚪'} ${ratingLabel[analysis.overall_rating] || analysis.overall_rating}\n\n`

  md += `## Summary\n\n${analysis.summary}\n\n`

  if (analysis.stats) {
    md += `**Stats:** ${analysis.stats.total_clauses} clauses analyzed · ${analysis.stats.founder_friendly} founder-friendly · ${analysis.stats.needs_attention} need attention\n\n`
  }

  md += `---\n\n## Clause-by-Clause Analysis\n\n`

  for (const clause of analysis.clauses) {
    const emoji = ratingEmoji[clause.rating] || '⚪'
    md += `### ${emoji} ${clause.name}\n\n`
    md += `> ${clause.extracted_text}\n\n`
    md += `**What this means:** ${clause.explanation}\n\n`
    md += `**Market comparison:** ${clause.market_comparison}\n\n`
    md += `---\n\n`
  }

  return md
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, fileName, fileUrl, fileSize, fileType, analysis } = body

    if (!companyId || !fileName || !analysis) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, fileName, analysis' },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()

    // Verify user owns this company
    const { data: company } = await supabase
      .from('company_pages')
      .select('id, user_id')
      .eq('id', companyId)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check if user is owner or team member
    let isAuthorized = company.user_id === user.id
    if (!isAuthorized) {
      const { data: member } = await supabase
        .from('team_members')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      isAuthorized = !!member
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get user name for uploaded_by_name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const uploaderName = profile?.full_name || user.email || 'Unknown'

    const savedDocs: string[] = []

    // 1. Save original term sheet if fileUrl provided
    if (fileUrl) {
      const { data: termSheetDoc, error: tsErr } = await supabase
        .from('dealroom_documents')
        .insert({
          company_id: companyId,
          uploaded_by: user.id,
          uploaded_by_name: uploaderName,
          file_name: fileName,
          file_url: fileUrl,
          file_size: fileSize || 0,
          file_type: fileType || 'application/pdf',
          category: 'term_sheet',
          is_public: false,
          is_private: true,
        })
        .select('id')
        .single()

      if (tsErr) {
        console.error('[term-sheet/save] Error saving term sheet:', tsErr)
      } else {
        savedDocs.push(termSheetDoc.id)
      }
    }

    // 2. Generate markdown from analysis and upload
    const markdown = generateMarkdown(analysis, fileName)
    const analysisFileName = `${fileName.replace(/\.[^.]+$/, '')}_analysis.md`
    const timestamp = Date.now()
    const storagePath = `dealroom/${companyId}/${timestamp}/${analysisFileName}`

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(storagePath, Buffer.from(markdown, 'utf-8'), {
        contentType: 'text/markdown',
        upsert: false,
      })

    if (uploadErr) {
      console.error('[term-sheet/save] Error uploading analysis:', uploadErr)
      return NextResponse.json({ error: 'Failed to save analysis file' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(uploadData.path)

    // 3. Save analysis doc to dealroom_documents
    const { data: analysisDoc, error: adErr } = await supabase
      .from('dealroom_documents')
      .insert({
        company_id: companyId,
        uploaded_by: user.id,
        uploaded_by_name: uploaderName,
        file_name: analysisFileName,
        file_url: publicUrl,
        file_size: Buffer.byteLength(markdown, 'utf-8'),
        file_type: 'text/markdown',
        category: 'term_sheet_analysis',
        description: `AI analysis of ${fileName}`,
        is_public: false,
        is_private: true,
      })
      .select('id')
      .single()

    if (adErr) {
      console.error('[term-sheet/save] Error saving analysis doc:', adErr)
      return NextResponse.json({ error: 'Failed to save analysis record' }, { status: 500 })
    }

    savedDocs.push(analysisDoc.id)

    return NextResponse.json({
      success: true,
      savedDocIds: savedDocs,
    })
  } catch (error) {
    console.error('[term-sheet/save] Error:', error)
    const message = error instanceof Error ? error.message : 'Save failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
