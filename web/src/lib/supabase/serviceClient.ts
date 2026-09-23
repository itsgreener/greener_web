import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Cliente de Supabase con la SECRET KEY (service role): salta RLS por
 * completo. Úsalo únicamente en código que se ejecuta en servidor y
 * solo para las tablas que arquitectónicamente no tienen política
 * pública — hoy, feed_session/feed_round (§8.5: "el cliente no puede
 * alterar cuotas ni seed", ver comentario de la migración
 * 20260806090700_rls_policies.sql), y `content`/`case_detail`/`episode`
 * exclusivamente desde `resolvePreviewContext.ts` (§15.3: preview con
 * token firmado) — ahí la RLS bloquea por completo cualquier lectura de
 * contenido no publicado, así que un token válido es la única forma de
 * ver un borrador sin sesión de admin.
 *
 * NUNCA importar este módulo desde un componente cliente ('use client')
 * ni exponer su resultado, directa o indirectamente, en una respuesta al
 * navegador. Para todo lo que sí tiene política pública de lectura
 * (content, pin, tag, feed_config...), usa un cliente normal con la
 * publishable key — no hace falta saltarse RLS para leer lo que ya es
 * público.
 */
export function createServiceClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
