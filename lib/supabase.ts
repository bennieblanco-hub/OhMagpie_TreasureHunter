import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client — used in components
export const supabase = createClient(supabaseUrl, supabaseAnon)

// Server client — used in API routes (has service role key)
export function supabaseServer() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
}
