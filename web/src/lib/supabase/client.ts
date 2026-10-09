import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database'
import { clientEnv } from '@/lib/env.client'

export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}
