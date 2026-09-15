'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'
import { useMasonryPositions } from '../useMasonryPositions'
import { useHomeFeedContext } from './HomeFeedProvider'

/**
 * Feed real de la home: abre una feedSession (POST /api/feed/sessions,
 * arquitectura §6.1) y pagina por cursor (GET /api/feed/{sessionId},
 * §16.1). El estado (sesión, pines ya cargados, scroll) vive en
 * HomeFeedProvider, no en este hook — así sobrevive a navegar a
 * /work/[slug] y volver sin perder ni refetchear nada (§6.2, criterio de
 * aceptación §20.1: "volver desde un detalle conserva orden, batches y
 * posición").
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
  const { state, setSessionId, appendBatch, setScrollY } = useHomeFeedContext()

  const loadingRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Abrir sesión solo si esta carga del documento todavía no tiene una
  // (§6.1 — una feedSession por pageLoadId, no una por cada montaje de
  // este componente: volver de /work/[slug] reutiliza la que ya había).
  useEffect(() => {
    if (state.sessionId) return
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
    // Solo al montar / cuando todavía no hay sesión — no depende de
    // state.sessionId en el array para no reabrir sesión si cambiara por
    // cualquier otra razón.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = useCallback(async () => {
    if (!state.sessionId || loadingRef.current || !state.hasMore) return
    loadingRef.current = true
    setIsLoading(true)
    try {
      const batch = await fetchBatch(state.sessionId, state.cursor)
      appendBatch(batch)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el feed.',
      )
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
    // state.cursor/state.hasMore se leen en cada llamada vía closure de
    // este mismo render — no hace falta más que sessionId para decidir
    // cuándo recrear la función.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessionId, appendBatch])

  // Primer lote en cuanto hay sesión y todavía no hay ningún pin — si ya
  // había pines (volviendo de un detalle), no se pide nada de más.
  // queueMicrotask: llamar a loadMore() (que hace setState) de forma
  // síncrona dentro del cuerpo del efecto dispara el aviso
  // react-hooks/set-state-in-effect — diferirlo un tick rompe esa cadena
  // síncrona sin cambiar el comportamiento real (sigue disparándose en
  // cuanto hay sesión).
  useEffect(() => {
    if (state.sessionId && state.items.length === 0) {
      queueMicrotask(() => loadMore())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessionId])

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

  // Guarda la posición de scroll continuamente (throttled por rAF) para
  // poder restaurarla si se vuelve de un detalle.
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrollY(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [setScrollY])

  const { containerRef, positioned, totalHeight } = useMasonryPositions(
    state.items,
    state.batchSizes,
  )

  // Restauración: si al montar ESTE hook ya había pines en el contexto
  // (vuelta de un detalle — el Provider no se desmonta, ver
  // HomeFeedProvider.tsx), saltar a la posición de scroll guardada en
  // cuanto el layout tenga altura real; antes de eso el scroll caería en
  // una zona vacía. useRef captura el valor solo en el montaje de este
  // hook, no en los renders siguientes — por eso vuelve a evaluarse
  // correctamente cada vez que se entra de nuevo en / (nuevo montaje).
  const shouldRestoreRef = useRef(state.items.length > 0)
  useEffect(() => {
    if (!shouldRestoreRef.current || totalHeight === 0) return
    window.scrollTo(0, state.scrollY)
    shouldRestoreRef.current = false
    // Solo depende de que totalHeight pase a ser > 0 la primera vez —
    // state.scrollY sigue cambiando después (por el propio scroll del
    // usuario) y no debe volver a disparar esto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalHeight])

  return {
    containerRef,
    positioned,
    totalHeight,
    isLoading,
    itemCount: state.items.length,
    error,
  }
}
