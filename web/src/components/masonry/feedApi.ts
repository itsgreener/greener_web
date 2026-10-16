import { PHONE_BATCH_SIZE } from '@/modules/feed/domain/batchSize'
import type { FeedBatchResult } from '@/modules/feed/domain/feedReadModels'
import { BREAKPOINT_PX } from '@/modules/shared/domain/breakpoints'

/**
 * Cliente HTTP del feed, compartido por useFeed (home y subhomes) y por el
 * panel de recomendaciones de los detalles: los dos abren una sesión con
 * POST /api/feed/sessions y la paginan por cursor con GET /api/feed/{id}.
 */

export async function openFeedSession(
  scope: string,
  // Solo el panel de recomendaciones lo manda: el contenido que se está
  // viendo no se recomienda a sí mismo.
  excludeContentId?: string,
): Promise<string> {
  const res = await fetch('/api/feed/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      excludeContentId === undefined ? { scope } : { scope, excludeContentId },
    ),
  })
  if (!res.ok) {
    throw new Error(`Could not open the feed session: ${res.status}`)
  }
  const data = (await res.json()) as { sessionId: string }
  return data.sessionId
}

/**
 * Tamaño de lote que pide este dispositivo: en móvil 20 pines por lote; en el
 * resto no se pide nada y el servidor usa el configurado (`batch_size`, 40).
 */
export function requestedBatchSize(viewportWidth: number): number | null {
  return viewportWidth < BREAKPOINT_PX.mobile ? PHONE_BATCH_SIZE : null
}

export async function fetchFeedBatch(
  sessionId: string,
  cursor: string | null,
): Promise<FeedBatchResult> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  const size =
    typeof window === 'undefined' ? null : requestedBatchSize(window.innerWidth)
  if (size !== null) params.set('size', String(size))

  const query = params.toString()
  const res = await fetch(
    query ? `/api/feed/${sessionId}?${query}` : `/api/feed/${sessionId}`,
  )
  if (!res.ok) {
    throw new Error(`Could not fetch the feed batch: ${res.status}`)
  }
  return (await res.json()) as FeedBatchResult
}
