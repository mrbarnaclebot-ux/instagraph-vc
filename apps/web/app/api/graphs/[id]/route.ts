import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const supabase = createSupabaseAdmin()

    // Ownership check: .eq('user_id', userId) prevents deleting other users' graphs
    const { error } = await supabase
      .from('graphs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete graph' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
