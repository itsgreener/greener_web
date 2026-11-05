import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getTalentEnv } from '@/lib/serverEnv'

let client: SupabaseClient | undefined

/**
 * Cliente de Supabase-talent con la clave SECRETA (salta RLS). Es otro proyecto
 * distinto al de la web y el esquema es el que ya usa n8n, así que no hay
 * tipos generados: las columnas están fijadas en el repositorio y en los tests
 * de contrato.
 *
 * Solo servidor. Nunca se importa desde un componente ni se devuelve su
 * resultado tal cual al navegador (por eso `CandidateFormView` existe).
 */
export function getTalentClient(): SupabaseClient {
  if (client) return client

  const env = getTalentEnv()

  client = createClient(
    env.TALENT_SUPABASE_URL,
    env.TALENT_SUPABASE_SECRET_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )

  return client
}
