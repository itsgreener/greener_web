'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  FeedBatchItem,
  FeedBatchResult,
} from '@/modules/feed/application/getFeedSessionBatch'
import { useMasonryPositions } from '../useMasonryPositions'

/**
 * Feed real de la home: abre una feedSession (POST /api/feed/sessions,
 * arquitectura §6.1) y pagina por cursor (GET /api/feed/{sessionId},
 * §16.1) en vez del offset fijo del prototipo de demo.
 *
 * Primera versión, a propósito lo más simple posible: una sesión por
 * montaje del componente, sin restaurar el feed al volver de un detalle
 * (`/work/[slug]`) — entrar y volver recarga desde cero. La restauración
 * real (pageLoadId + sessionStorage + estado en el layout, §6.2) queda
 * para más adelante, cuando haga falta cumplir de verdad el criterio de
 * aceptación de "vuelta atrás conserva orden y posición" (§20.1).
 */

async function openFeedSession(): Promise<string> {
  const res = await fetch('/api/feed/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: 'home' }),
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

export function useHomeFeed() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [items, setItems] = useState<FeedBatchItem[]>([])
  const [batchSizes, setBatchSizes] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cursorRef = useRef<string | null>(null)
  const hasMoreRef = useRef(true)
  const loadingRef = useRef(false)

  // Una sesión por montaje — ver nota de alcance arriba.
  useEffect(() => {
    let cancelled = false
    openFeedSession()
      .then((id) => {
        if (!cancelled) setSessionId(id)
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
  }, [])

  const loadMore = useCallback(async () => {
    if (!sessionId || loadingRef.current || !hasMoreRef.current) return
    loadingRef.current = true
    setIsLoading(true)
    try {
      const batch = await fetchBatch(sessionId, cursorRef.current)
      setItems((prev) => [...prev, ...batch.items])
      setBatchSizes((prev) => [...prev, batch.items.length])
      cursorRef.current = batch.cursor
      hasMoreRef.current = batch.hasMore
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el feed.',
      )
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
  }, [sessionId])

  // Primer lote en cuanto hay sesión abierta.
  useEffect(() => {
    if (sessionId && items.length === 0) {
      loadMore()
    }
    // Solo al abrir sesión — loadMore ya depende de sessionId, no hace
    // falta reincluir items.length o dispararía un bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Prefetch del siguiente lote al entrar en el último tramo del scroll
  // (arquitectura §10.3), aproximado con un sentinel al final del documento.
  useEffect(() => {
    const sentinel = document.getElementById('greener-home-feed-sentinel')
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '600px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const { containerRef, positioned, totalHeight } = useMasonryPositions(
    items,
    batchSizes,
  )

  return {
    containerRef,
    positioned,
    totalHeight,
    isLoading,
    itemCount: items.length,
    error,
  }
}
