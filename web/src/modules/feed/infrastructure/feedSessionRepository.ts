import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/serviceClient'

/**
 * Persistencia de feed_session/feed_round (arquitectura §8.5). Usa
 * siempre la service role key (serviceClient.ts) porque estas dos tablas
 * no tienen política pública — es deliberado, no un descuido de RLS (ver
 * comentario en supabase/migrations/20260806090700_rls_policies.sql).
 */

export interface FeedSessionRow {
  id: string
  seed: string
  scope: string
  expiresAt: string
}

export async function createFeedSessionRow(
  params: { scope: string; filterHash: string | null },
  client: SupabaseClient = createServiceClient(),
): Promise<FeedSessionRow> {
  // Seed criptográficamente aleatoria por carga de documento (arquitectura
  // §6.1) — no derivada de nada predecible por el cliente.
  const seed = crypto.randomUUID()

  const { data, error } = await client
    .from('feed_session')
    .insert({ seed, scope: params.scope, filter_hash: params.filterHash })
    .select('id, seed, scope, expires_at')
    .single()

  if (error || !data) {
    throw new Error(
      `No se pudo crear la sesión de feed: ${error?.message ?? 'sin datos'}`,
    )
  }

  return {
    id: data.id,
    seed: data.seed,
    scope: data.scope,
    expiresAt: data.expires_at,
  }
}

export async function getFeedSessionRow(
  sessionId: string,
  client: SupabaseClient = createServiceClient(),
): Promise<FeedSessionRow | null> {
  const { data, error } = await client
    .from('feed_session')
    .select('id, seed, scope, expires_at')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo leer la sesión de feed: ${error.message}`)
  }
  if (!data) return null

  return {
    id: data.id,
    seed: data.seed,
    scope: data.scope,
    expiresAt: data.expires_at,
  }
}

export async function getFeedRound(
  sessionId: string,
  roundIndex: number,
  client: SupabaseClient = createServiceClient(),
): Promise<string[] | null> {
  const { data, error } = await client
    .from('feed_round')
    .select('ordered_pin_ids')
    .eq('session_id', sessionId)
    .eq('round_index', roundIndex)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo leer la ronda del feed: ${error.message}`)
  }
  return data?.ordered_pin_ids ?? null
}

/**
 * Persiste una ronda ya calculada. Una vez guardada, es inmutable: los
 * pines ya servidos no se modifican aunque cambie el contenido publicado
 * después (arquitectura §8.5). `upsert` con ese conflicto es solo defensa
 * ante una carrera entre dos requests concurrentes pidiendo la misma
 * ronda por primera vez a la vez — el resultado, al ser determinista para
 * la misma seed+ronda, sería idéntico igualmente.
 */
export async function saveFeedRound(
  sessionId: string,
  roundIndex: number,
  orderedPinIds: string[],
  client: SupabaseClient = createServiceClient(),
): Promise<void> {
  const { error } = await client.from('feed_round').upsert(
    {
      session_id: sessionId,
      round_index: roundIndex,
      ordered_pin_ids: orderedPinIds,
    },
    { onConflict: 'session_id,round_index' },
  )

  if (error) {
    throw new Error(`No se pudo guardar la ronda del feed: ${error.message}`)
  }
}
