import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Cliente de Supabase con la publishable key, sin manejo de cookies: para
 * lecturas públicas y anónimas que ya están cubiertas por las políticas
 * de RLS de "solo contenido publicado" (content, pin, tag, feed_config...).
 * No hace falta el ciclo de cookies de auth (client.ts/server.ts) para
 * consultas que no dependen de una sesión de usuario — el feed público
 * no la tiene.
 */
export function createPublicReadClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
