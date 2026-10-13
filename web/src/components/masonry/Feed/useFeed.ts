'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import { useMasonryPositions } from '@/components/masonry/useMasonryPositions'
import { useFeedContext } from '@/components/masonry/FeedProvider'
import { fetchFeedBatch, openFeedSession } from '@/components/masonry/feedApi'
import { useSentinel } from '@/components/masonry/useSentinel'

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

export function useFeed(scope: string) {
  const { getState, setSessionId, appendBatch, setScrollY } = useFeedContext()
  const state = getState(scope)

  const loadingRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'No se pudo abrir el feed.',
          )
        }
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

      // Un batch vacío (fin de catálogo real, o límite de peticiones
      // superado — feedRateLimit.ts) no cuenta como profundidad real
      // alcanzada: nada que el visitante haya visto de más.
      if (batch.items.length > 0) {
        trackAnalyticsEvent(
          'Feed Depth',
          {
            section: scope,
            round: batch.round,
            // Implementación actual: una ronda se sirve como un único
            // batch. Cuando una ronda se trocee en varios lotes, este
            // valor podrá avanzar dentro de la misma ronda.
            batch: 0,
          },
          { interactive: false },
        )
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el feed.',
      )
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
  const sentinelRef = useSentinel(loadMore)

  // Guarda la posición de scroll continuamente (throttled por rAF) para
  // poder restaurarla si se vuelve de un detalle.
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrollY(scope, window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [scope, setScrollY])

  const { containerRef, positioned, totalHeight } = useMasonryPositions(
    state.items,
    state.batchSizes,
  )

  // Restauración: si al montar ESTE hook ya había pines en el contexto
  // (vuelta de un detalle), saltar a la posición de scroll guardada en
  // cuanto el layout tenga altura real — antes de eso el scroll caería
  // en una zona vacía. useRef captura el valor solo en el montaje de
  // este hook, no en los renders siguientes.
  const shouldRestoreRef = useRef(state.items.length > 0)
  useEffect(() => {
    if (!shouldRestoreRef.current || totalHeight === 0) return
    window.scrollTo(0, getState(scope).scrollY)
    shouldRestoreRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalHeight])

  return {
    containerRef,
    positioned,
    totalHeight,
    isLoading,
    itemCount: state.items.length,
    hasMore: state.hasMore,
    error,
    sentinelRef,
  }
}
