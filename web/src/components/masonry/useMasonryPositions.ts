'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import type { PinCardData } from '@/components/pin/PinCard'

/**
 * Posicionamiento masonry + virtualización, extraído de lo que antes vivía
 * dentro de useMasonryFeed.ts (Fase 1) para que lo compartan el prototipo
 * de demo y el feed real de la home — ninguno de los dos necesita saber
 * cómo se posiciona ni se virtualiza, solo darle una lista de items.
 *
 * `batchSizes` son los tamaños REALES de cada lote según fue llegando
 * (arquitectura §8.2): las cuotas del feed no garantizan exactamente 40
 * pines por ronda (dependen del universo publicado en ese momento), así
 * que la virtualización agrupa por los límites reales, no por un tamaño
 * fijo asumido.
 */

export interface PositionedPin {
  item: PinCardData
  x: number
  y: number
  width: number
  height: number
  mounted: boolean
}

function batchIndexForItem(index: number, batchSizes: number[]): number {
  let acc = 0
  for (let b = 0; b < batchSizes.length; b++) {
    acc += batchSizes[b]
    if (index < acc) return b
  }
  return Math.max(0, batchSizes.length - 1)
}

export function useMasonryPositions(
  items: PinCardData[],
  batchSizes: number[],
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

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

    // Altura de cada batch real (para la virtualización), aproximada por
    // el rango [min y, max y+height] de sus items — arquitectura §10.2.
    const batchHeights: BatchHeight[] = []
    let start = 0
    for (let b = 0; b < batchSizes.length; b++) {
      const slice = layout.positions.slice(start, start + batchSizes[b])
      start += batchSizes[b]
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
      const batchIndex = batchIndexForItem(index, batchSizes)
      return {
        item: items[index],
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        mounted: mountedBatchIndexes.has(batchIndex),
      }
    })
  }, [layout, items, batchSizes, relativeScrollCenter])

  return {
    containerRef,
    positioned,
    totalHeight: layout?.totalHeight ?? 0,
  }
}
