import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database'
import { clientEnv } from '@/lib/env.client'
import { createBrowserCookieAdapter } from '@/lib/supabase/browserCookies'

export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    // Cookies del flujo PKCE de 10 minutos y `Secure` (SEC-X-1a).
    { cookies: createBrowserCookieAdapter() },
  )
}
