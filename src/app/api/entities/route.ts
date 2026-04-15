import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getSupabase } from '@/lib/db'
import { getAvailableEntities, createEntity } from '@/lib/entity-context'

/**
 * GET /api/entities — list user's entities
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getSupabase()
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ entities: [] })

    const entities = await getAvailableEntities(profile.id)
    return NextResponse.json({ entities })
  } catch (error) {
    console.error('[entities] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/entities — create a new entity
 * Body: { name, type, description?, thesis?, website_url?, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getSupabase()
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }

    const validTypes = ['startup', 'fund', 'family_office', 'angel', 'lender']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const entity = await createEntity(
      {
        name: body.name,
        type: body.type,
        description: body.description,
        thesis: body.thesis,
        website_url: body.website_url,
        linkedin_url: body.linkedin_url,
        country: body.country,
        industry: body.industry,
        stage: body.stage,
        one_liner: body.one_liner,
      },
      profile.id,
    )

    return NextResponse.json({ entity }, { status: 201 })
  } catch (error) {
    console.error('[entities] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
