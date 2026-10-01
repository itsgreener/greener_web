'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import { useMasonryPositions } from '../useMasonryPositions'
import { useFeedContext } from '../FeedProvider'

/**
 * Feed real de la home y las subhomes: abre una feedSession (POST
 * /api/feed/sessions, arquitectura §6.1) con el scope indicado y pagina
 * por cursor (GET /api/feed/{sessionId}, §16.1).
 *
 * 15 sep: generalizado de "solo home" (useHomeFeed) a cualquier scope —
 * cada scope tiene su propio hueco de estado en FeedProvider (sesión,
 * pines, cursor, scroll), así que dos <Feed> con scope distinto en la
 * misma carga de documento no se pisan entre sí.
 *
 * Primera versión, a propósito lo más simple posible: una sesión por
 * scope y por carga completa del documento, sin filtrar más (por
 * etiqueta, idioma...) — eso es una capa aparte, no de este hook.
 */

async function openFeedSession(scope: string): Promise<string> {
  const res = await fetch('/api/feed/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope }),
  })
  if (!res.ok) {
    throw new Error(`No se pudo abrir la sesión de feed: ${res.status}`)
  }
  const data = (await res.json()) as { sessionId: string }
  return data.sessionId
}

async function fetchBatch(
  sessionId: string,
  cursor: string | null,
): Promise<FeedBatchResult> {
  const url = cursor
    ? `/api/feed/${sessionId}?cursor=${encodeURIComponent(cursor)}`
    : `/api/feed/${sessionId}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fallo al pedir el lote del feed: ${res.status}`)
  }
  return res.json()
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, state.sessionId])

  const loadMore = useCallback(async () => {
    const current = getState(scope)
    if (!current.sessionId || loadingRef.current || !current.hasMore) return
    loadingRef.current = true
    setIsLoading(true)
    try {
      const batch = await fetchBatch(current.sessionId, current.cursor)

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
  // (arquitectura §10.3), aproximado con un sentinel al final del documento.
  useEffect(() => {
    const sentinel = document.getElementById(`greener-feed-sentinel-${scope}`)
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '600px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [scope, loadMore])

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
    sentinelId: `greener-feed-sentinel-${scope}`,
  }
}
