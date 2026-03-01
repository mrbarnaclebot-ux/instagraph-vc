import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-side only — uses service role key. Never import in client components.
// Used by Route Handlers (app/api/**) which run server-side.

let _client: SupabaseClient | null = null

export function createSupabaseAdmin(): SupabaseClient {
  if (_client) return _client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
      'Set these in your .env.local file (see .env.local.example).'
    )
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: false, // Route Handlers are stateless
      autoRefreshToken: false,
    },
  })

  return _client
}
