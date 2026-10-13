'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  computeMasonryLayout,
  columnsForViewport,
  GAP,
  type LayoutInputItem,
  type PinRatio,
} from '@/modules/masonry/domain/layout'
import {
  computeVirtualization,
  type BatchHeight,
} from '@/modules/masonry/domain/virtualization'
import { estimateLabelHeight } from '@/modules/masonry/domain/labelHeight'
import type { PinCardData } from '@/components/pin/PinCard'
import { useContainerWidth } from './useContainerWidth'

/**
 * Posicionamiento masonry + virtualización, compartido por el feed de la
 * home/subhomes y por las recomendaciones de las fichas: quien lo usa solo
 * da una lista de items, no sabe cómo se posiciona ni se virtualiza.
 *
 * `batchSizes` son los tamaños REALES de cada lote según fue llegando
 * (arquitectura §8.2): las cuotas del feed no garantizan exactamente 40
 * pines por ronda (dependen del universo publicado en ese momento), así
 * que la virtualización agrupa por los límites reales, no por un tamaño
 * fijo asumido.
 */

export interface PositionedPin {
  /**
   * Identidad de ESTA tarjeta en la lista, única aunque el mismo pin salga
   * varias veces (el feed es infinito y recicla pines: ver PROGRESO). La
   * lista solo crece por el final y un ítem nunca cambia de posición, así
   * que el índice global es una clave estable; el pinId se añade solo para
   * poder leerla en las DevTools. NUNCA usar `item.pinId` como key.
   */
  key: string
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
  const { containerRef, containerWidth } = useContainerWidth()

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
  }, [containerRef])

  const columnCount = columnsForViewport(containerWidth || 1200)

  const layoutItems = useMemo<LayoutInputItem[]>(() => {
    if (containerWidth === 0) return []

    const columnWidth = (containerWidth - GAP * (columnCount - 1)) / columnCount

    return items.map((item) => ({
      id: item.pinId,
      ratio: item.ratio as PinRatio,
      labelHeight: estimateLabelHeight(item, columnWidth),
    }))
  }, [items, containerWidth, columnCount])

  const layout = useMemo(() => {
    if (containerWidth === 0) return null
    return computeMasonryLayout(layoutItems, containerWidth, columnCount)
  }, [layoutItems, containerWidth, columnCount])

  const positioned: PositionedPin[] = useMemo(() => {
    if (!layout) return []

    // Altura de cada batch real (para la virtualización), incluyendo la
    // reserva estimada del texto. Antes solo se contaba el medio, lo que
    // hacía la estimación cada vez menos precisa cuando el rótulo ocupaba
    // más de una línea.
    const batchHeights: BatchHeight[] = []
    let start = 0
    for (let b = 0; b < batchSizes.length; b++) {
      const batchStart = start
      const slice = layout.positions.slice(start, start + batchSizes[b])
      start += batchSizes[b]
      if (slice.length === 0) continue

      const top = Math.min(...slice.map((p) => p.y))
      const bottom = Math.max(
        ...slice.map((p, offset) => {
          const labelHeight = layoutItems[batchStart + offset]?.labelHeight ?? 0
          return p.y + p.height + labelHeight
        }),
      )

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
        key: `${index}:${items[index].pinId}`,
        item: items[index],
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        mounted: mountedBatchIndexes.has(batchIndex),
      }
    })
  }, [layout, layoutItems, items, batchSizes, relativeScrollCenter])

  return {
    containerRef,
    positioned,
    totalHeight: layout?.totalHeight ?? 0,
  }
}
