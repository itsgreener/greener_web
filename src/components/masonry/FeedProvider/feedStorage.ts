import {
  isNewsletterItem,
  type FeedBatchItem,
} from '@/modules/feed/domain/feedReadModels'
import { hasNewsletterCookie } from '@/modules/newsletter/client/newsletterCookie'
import { pageLoadId } from '@/components/masonry/pageLoadId'

/**
 * Estado del feed por scope y su respaldo en `sessionStorage`: funciones
 * puras y de almacenamiento, sin React, que usa `FeedProvider`.
 */

export interface ScopeFeedState {
  sessionId: string | null
  items: FeedBatchItem[]
  batchSizes: number[]
  cursor: string | null
  hasMore: boolean
  scrollY: number
}

export const EMPTY_SCOPE_STATE: ScopeFeedState = {
  sessionId: null,
  items: [],
  batchSizes: [],
  cursor: null,
  hasMore: true,
  scrollY: 0,
}

export type FeedProviderState = Record<string, ScopeFeedState>

/** Lote tal y como lo recibe `appendBatch` (un `FeedBatchResult` sirve). */
export interface FeedBatchInput {
  items: FeedBatchItem[]
  cursor: string
  hasMore: boolean
  rateLimited?: boolean
}

const STORAGE_KEY = 'greener:feed'

/**
 * Quita de un scope las tarjetas de newsletter (salvo `keepPinId`, la que
 * acaba de usarse y muestra su mensaje de éxito) y corrige el tamaño de cada
 * lote para que la virtualización siga agrupando bien.
 */
export function withoutNewsletter(
  state: ScopeFeedState,
  keepPinId?: string,
): ScopeFeedState {
  const items: FeedBatchItem[] = []
  const batchSizes: number[] = []
  let index = 0

  for (const size of state.batchSizes) {
    let kept = 0
    for (const item of state.items.slice(index, index + size)) {
      if (isNewsletterItem(item) && item.pinId !== keepPinId) continue
      items.push(item)
      kept += 1
    }
    batchSizes.push(kept)
    index += size
  }

  return items.length === state.items.length
    ? state
    : { ...state, items, batchSizes }
}

export function readFromSessionStorage(): FeedProviderState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as {
      pageLoadId: string
      scopes: FeedProviderState
    }
    // El id no coincide: es una carga de documento distinta (recarga
    // real) — el estado guardado no vale, arquitectura §6.1.
    if (parsed.pageLoadId !== pageLoadId) return {}
    const scopes = parsed.scopes ?? {}

    // Un dispositivo ya suscrito (cookie `greener_newsletter`) no vuelve a ver
    // el pin de newsletter, tampoco en el estado restaurado.
    if (!hasNewsletterCookie()) return scopes

    return Object.fromEntries(
      Object.entries(scopes).map(([scope, state]) => [
        scope,
        withoutNewsletter(state),
      ]),
    )
  } catch {
    return {}
  }
}

export function writeToSessionStorage(scopes: FeedProviderState) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ pageLoadId, scopes }),
    )
  } catch {
    // sessionStorage lleno o inaccesible (navegación privada estricta,
    // por ejemplo): es solo el respaldo, el estado en memoria sigue
    // funcionando igual durante esta misma carga del documento.
  }
}

/** Copia del estado con el scroll más reciente de cada scope. */
export function withScroll(
  scopes: FeedProviderState,
  scrollByScope: Record<string, number>,
): FeedProviderState {
  const result: FeedProviderState = {}
  for (const [scope, state] of Object.entries(scopes)) {
    result[scope] = { ...state, scrollY: scrollByScope[scope] ?? state.scrollY }
  }
  return result
}
