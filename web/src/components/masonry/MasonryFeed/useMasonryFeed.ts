'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  computeMasonryLayout,
  columnsForViewport,
  type LayoutInputItem,
  type PinRatio,
} from '@/modules/masonry/domain/layout'
import {
  computeVirtualization,
  type BatchHeight,
} from '@/modules/masonry/domain/virtualization'
import type {
  FeedBatchItem,
  FeedBatchResult,
} from '@/modules/feed/application/getDemoFeedBatch'

const BATCH_SIZE = 40 // arquitectura §8.1/§10.3 — mismo tamaño que producción

async function fetchBatch(
  seed: string,
  offset: number,
): Promise<FeedBatchResult> {
  const res = await fetch(
    `/api/feed/demo?seed=${seed}&offset=${offset}&count=${BATCH_SIZE}`,
  )
  if (!res.ok)
    throw new Error(
      `Fallo al pedir el lote del feed (offset=${offset}): ${res.status}`,
    )
  return res.json()
}

export interface PositionedPin {
  item: FeedBatchItem
  x: number
  y: number
  width: number
  height: number
  mounted: boolean
}

export function useMasonryFeed() {
  const containerRef = useRef<HTMLDivElement | null>(null)

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

  const [items, setItems] = useState<FeedBatchItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const loadingRef = useRef(false)

  // Ancho del contenedor — determina columnas (§10.1) sin depender del
  // ancho de window completo (el shell reserva la barra lateral).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const loadMore = useCallback(async () => {
    if (!seed || loadingRef.current) return
    loadingRef.current = true
    setIsLoading(true)
    try {
      const batch = await fetchBatch(seed, items.length)
      setItems((prev) => [...prev, ...batch.items])
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

  // Centro del viewport relativo al contenedor, para estimar qué batch
  // está "visible" (heurística — la versión de producción usaría
  // IntersectionObserver por batch, arquitectura §10.2). Se calcula dentro
  // del handler de scroll (efecto, no render), donde sí es seguro leer refs.
  const [relativeScrollCenter, setRelativeScrollCenter] = useState(0)
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const containerTop = containerRef.current?.offsetTop ?? 0
        const center = window.scrollY + window.innerHeight / 2
        setRelativeScrollCenter(Math.max(0, center - containerTop))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const columnCount = columnsForViewport(containerWidth || 1200)

  const layout = useMemo(() => {
    if (containerWidth === 0) return null
    const layoutItems: LayoutInputItem[] = items.map((i) => ({
      id: i.pinId,
      ratio: i.ratio as PinRatio,
    }))
    return computeMasonryLayout(layoutItems, containerWidth, columnCount)
  }, [items, containerWidth, columnCount])

  const positioned: PositionedPin[] = useMemo(() => {
    if (!layout) return []

    // Altura de cada batch (para la virtualización), aproximada por el
    // rango [min y, max y+height] de sus items — arquitectura §10.2.
    const batchHeights: BatchHeight[] = []
    for (let b = 0; b * BATCH_SIZE < items.length; b++) {
      const slice = layout.positions.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
      if (slice.length === 0) continue
      const top = Math.min(...slice.map((p) => p.y))
      const bottom = Math.max(...slice.map((p) => p.y + p.height))
      batchHeights.push({ batchIndex: b, height: bottom - top })
    }

    const relativeCenter = relativeScrollCenter
    let visibleBatchIndex = 0
    let acc = 0
    for (const b of batchHeights) {
      if (relativeCenter < acc + b.height) {
        visibleBatchIndex = b.batchIndex
        break
      }
      acc += b.height
      visibleBatchIndex = b.batchIndex
    }

    const { mountedBatchIndexes } = computeVirtualization(
      batchHeights,
      visibleBatchIndex,
    )

    return layout.positions.map((pos, index) => {
      const batchIndex = Math.floor(index / BATCH_SIZE)
      return {
        item: items[index],
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        mounted: mountedBatchIndexes.has(batchIndex),
      }
    })
  }, [layout, items, relativeScrollCenter])

  return {
    containerRef,
    positioned,
    totalHeight: layout?.totalHeight ?? 0,
    isLoading,
    itemCount: items.length,
  }
}
