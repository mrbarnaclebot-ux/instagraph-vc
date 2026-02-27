import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

// Module-level Supabase client — reused across webhook invocations
// (Route Handlers are serverless but module caching provides reuse where possible)
const supabase = createSupabaseAdmin()

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req)

    if (evt.type === 'user.created') {
      const { id, email_addresses, created_at } = evt.data
      const email = email_addresses[0]?.email_address ?? ''

      const { error } = await supabase.from('users').upsert({
        id, // Clerk user_id is the primary key
        email,
        plan: 'free',
        created_at: new Date(created_at).toISOString(),
      })

      if (error) {
        console.error('[clerk-webhook] Supabase upsert error:', error)
        // Return 200 to prevent Clerk from retrying non-fatal errors
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    console.error('[clerk-webhook] Verification failed:', err)
    return new NextResponse('Webhook verification failed', { status: 400 })
  }
}
