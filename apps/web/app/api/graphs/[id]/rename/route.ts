import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabase = createSupabaseAdmin()

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

  const { error } = await supabase
    .from('graphs')
    .update({ title: title.trim() })
    .eq('id', id)
    .eq('user_id', userId)  // Ownership check

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
