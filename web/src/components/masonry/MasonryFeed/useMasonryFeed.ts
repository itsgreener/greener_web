'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  FeedBatchItem as DemoFeedBatchItem,
  FeedBatchResult as DemoFeedBatchResult,
} from '@/modules/feed/application/getDemoFeedBatch'
import type { PinCardData } from '@/components/pin/PinCard'
import { useMasonryPositions } from '../useMasonryPositions'

const BATCH_SIZE = 40 // arquitectura §8.1/§10.3 — mismo tamaño que producción

/**
 * El endpoint de demo (prototipo de Fase 0/1, todavía sin retocar) sigue
 * devolviendo su forma antigua: un único cloudinaryPublicId y label
 * siempre presente. La tarjeta real (PinCard) ya habla la forma nueva
 * (media[], label opcional) porque es la que devuelve de verdad
 * getFeedSessionBatch — este adaptador solo existe para que este
 * prototipo de demo siga compilando y pintándose mientras no se
 * sustituye por el feed real (ver PROGRESO.md).
 */
function toPinCardData(item: DemoFeedBatchItem): PinCardData {
  return {
    pinId: item.pinId,
    destination: item.destination,
    ratio: item.ratio,
    label: item.label,
    cta: item.cta,
    alt: item.alt,
    media: [{ kind: 'image', cloudinaryPublicId: item.cloudinaryPublicId }],
  }
}

async function fetchBatch(
  seed: string,
  offset: number,
): Promise<{ items: PinCardData[]; hasMore: boolean }> {
  const res = await fetch(
    `/api/feed/demo?seed=${seed}&offset=${offset}&count=${BATCH_SIZE}`,
  )
  if (!res.ok)
    throw new Error(
      `Fallo al pedir el lote del feed (offset=${offset}): ${res.status}`,
    )
  const batch = (await res.json()) as DemoFeedBatchResult
  return { items: batch.items.map(toPinCardData), hasMore: batch.hasMore }
}

export function useMasonryFeed() {
  // Semilla de sesión: se genera una sola vez por carga completa del
  // documento (brief §4.1, arquitectura §6.1). No en SSR: solo tiene
  // sentido una vez montado en cliente, para no desincronizar con el
  // servidor y para que cada `next start`/reload real produzca una nueva.
  const [seed, setSeed] = useState<string | null>(null)
  useEffect(() => {
    // Intencional: la seed debe generarse solo en cliente y diferir en
    // cada recarga real del documento (§6.1); un valor calculado en el
    // render (o en SSR) rompería exactamente esa garantía.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeed(crypto.randomUUID())
  }, [])

  const [items, setItems] = useState<PinCardData[]>([])
  const [batchSizes, setBatchSizes] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (!seed || loadingRef.current) return
    loadingRef.current = true
    setIsLoading(true)
    try {
      const batch = await fetchBatch(seed, items.length)
      setItems((prev) => [...prev, ...batch.items])
      setBatchSizes((prev) => [...prev, batch.items.length])
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
  }, [seed, items.length])

  // Primer lote en cuanto hay seed.
  useEffect(() => {
    if (seed && items.length === 0) {
      loadMore()
    }
    // Solo al obtener la seed por primera vez — loadMore ya depende de items.length,
    // no hace falta reincluirlo aquí o dispararía un bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  // Prefetch del siguiente lote al entrar en el último 30% del scroll
  // (arquitectura §10.3), aproximado con un sentinel al final del documento.
  useEffect(() => {
    const sentinel = document.getElementById('greener-feed-sentinel')
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
  }
}
