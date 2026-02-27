import { createClient } from '@supabase/supabase-js'

// Server-side only — uses service role key. Never import in client components.
// Used by Route Handlers (app/api/**) which run server-side.
export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  return createClient(url, key, {
    auth: {
      persistSession: false, // Route Handlers are stateless
      autoRefreshToken: false,
    },
  })
}
