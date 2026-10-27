'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import { useMasonryPositions } from '@/components/masonry/useMasonryPositions'
import { useFeedContext } from '@/components/masonry/FeedProvider'
import { fetchFeedBatch, openFeedSession } from '@/components/masonry/feedApi'
import { useSentinel } from '@/components/masonry/useSentinel'
import type { FeedScope } from '@/modules/feed/domain/feedScope'
import { useFeedScroll } from './useFeedScroll'

/**
 * Feed real de la home y las subhomes: abre una feedSession (POST
 * /api/feed/sessions, arquitectura §6.1) con el scope indicado y pagina
 * por cursor (GET /api/feed/{sessionId}, §16.1).
 *
 * Cada scope tiene su propio hueco de estado en FeedProvider (sesión, pines,
 * cursor, scroll), así que dos <Feed> con scope distinto en la misma carga
 * de documento no se pisan. Una sesión por scope y por carga completa del
 * documento; filtrar más (etiqueta, idioma…) sería otra capa, no este hook.
 */

/**
 * Espera antes de volver a pedir un lote que el servidor devolvió vacío por
 * superar el límite de peticiones (`rateLimited`). El límite es de 50 lotes
 * por minuto, así que unos segundos bastan y no se martillea la API.
 */
export const RATE_LIMIT_RETRY_MS = 4000

export function useFeed(scope: FeedScope) {
  const {
    getState,
    setSessionId,
    appendBatch,
    setScrollY,
    retireNewsletterCards,
  } = useFeedContext()
  const state = getState(scope)

  const loadingRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)

  // Reintento tras un lote vacío por límite de peticiones: tras la espera se
  // incrementa `recheck`, que recrea el observer del sentinel (ver
  // `useSentinel`). Si el visitante ya se alejó del final, no pasa nada.
  const [recheck, setRecheck] = useState(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Solo importa si falló: `Feed` pinta `feedCopy.loadError`, no el mensaje.
  const [error, setError] = useState(false)

  // Abrir sesión solo si este scope, en esta carga del documento,
  // todavía no tiene una (§6.1) — volver de un detalle a esta misma
  // subhome reutiliza la que ya había.
  useEffect(() => {
    if (state.sessionId) return
    let cancelled = false
    openFeedSession(scope)
      .then((id) => {
        if (!cancelled) setSessionId(scope, id)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
    // Solo al montar / cuando todavía no hay sesión para este scope.
  }, [scope, state.sessionId, setSessionId])

  const loadMore = useCallback(async () => {
    const current = getState(scope)
    if (!current.sessionId || loadingRef.current || !current.hasMore) return
    loadingRef.current = true
    setIsLoading(true)
    try {
      const batch = await fetchFeedBatch(current.sessionId, current.cursor)

      appendBatch(scope, batch)

      // `appendBatch` ignora el lote vacío por límite de peticiones y no
      // cambia el estado, así que nada volvería a disparar la carga: el
      // visitante se quedaba en el final hasta subir y volver a bajar.
      if (batch.rateLimited) {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null
          setRecheck((n) => n + 1)
        }, RATE_LIMIT_RETRY_MS)
      }

      // Un batch vacío (fin de catálogo real, o límite de peticiones
      // superado — feedRateLimit.ts) no cuenta como profundidad real
      // alcanzada: nada que el visitante haya visto de más.
      if (batch.items.length > 0) {
        trackAnalyticsEvent(
          'Feed Depth',
          {
            section: scope,
            round: batch.round,
            // Tramo dentro de la ronda (una ronda se sirve en varios lotes).
            batch: batch.batch,
          },
          { interactive: false },
        )
      }
    } catch {
      setError(true)
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
  }, [scope, getState, appendBatch])

  // Primer lote en cuanto hay sesión abierta para este scope.
  useEffect(() => {
    if (state.sessionId && state.items.length === 0) {
      queueMicrotask(() => loadMore())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, state.sessionId])

  // Prefetch del siguiente lote al entrar en el último tramo del scroll
  // (arquitectura §10.3).
  const sentinelRef = useSentinel(loadMore, recheck)

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    },
    [],
  )

  const { containerRef, positioned, totalHeight } = useMasonryPositions(
    state.items,
    state.batchSizes,
  )

  // Guardar el scroll y restaurarlo al volver de un detalle.
  const getScrollY = useCallback(
    () => getState(scope).scrollY,
    [getState, scope],
  )
  useFeedScroll(scope, {
    setScrollY,
    getScrollY,
    hadItemsOnMount: state.items.length > 0,
    ready: totalHeight > 0,
  })

  return {
    containerRef,
    positioned,
    totalHeight,
    isLoading,
    itemCount: state.items.length,
    hasMore: state.hasMore,
    error,
    sentinelRef,
    retireNewsletterCards,
  }
}
