import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { title } = await req.json() as { title?: string }

  if (!title || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
  }

  if (title.trim().length > 200) {
    return NextResponse.json({ error: 'Title is too long (max 200 characters)' }, { status: 400 })
  }

  try {
    const supabase = createSupabaseAdmin()

    const { error } = await supabase
      .from('graphs')
      .update({ title: title.trim() })
      .eq('id', id)
      .eq('user_id', userId)  // Ownership check

    if (error) {
      return NextResponse.json({ error: 'Failed to rename graph' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
