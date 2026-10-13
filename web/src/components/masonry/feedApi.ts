import type { FeedBatchResult } from '@/modules/feed/domain/feedReadModels'

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

export async function fetchFeedBatch(
  sessionId: string,
  cursor: string | null,
): Promise<FeedBatchResult> {
  const url = cursor
    ? `/api/feed/${sessionId}?cursor=${encodeURIComponent(cursor)}`
    : `/api/feed/${sessionId}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Could not fetch the feed batch: ${res.status}`)
  }
  return res.json()
}
