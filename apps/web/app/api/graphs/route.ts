import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseAdmin()

    // In dev, also include legacy "dev-user" graphs from FastAPI dev auth bypass
    const userIds = process.env.NODE_ENV === 'development' ? [userId, 'dev-user'] : [userId]
    const { data, error } = await supabase
      .from('graphs')
      .select('id, title, source_url, node_count, edge_count, neo4j_session_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to load graphs' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
