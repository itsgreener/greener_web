'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

/*
 * Debe mantenerse coordinado con PinCard.module.css:
 * - padding horizontal del texto: 12px por lado
 * - margin-top del texto: 8px
 * - font-size: 0.8rem = 12.8px sobre base 16
 * - line-height: 1.3 ≈ 16.64px
 * - separación title/secondary: 2px
 *
 * El layout es absoluto: si no reservamos aquí el alto REALISTA del texto,
 * la siguiente tarjeta empieza antes de que termine el rótulo. Ese era el
 * motivo de que visualmente la imagen de abajo quedase demasiado pegada.
 */
const LABEL_SIDE_PADDING = 12
const LABEL_TOP_GAP = 8
const LABEL_LINE_HEIGHT = 17
const LABEL_SECONDARY_GAP = 2
const LABEL_SAFETY = 2
const APPROX_CHAR_WIDTH = 6.5

function estimateWrappedLines(
  text: string,
  availableWidth: number,
  maxLines: number,
): number {
  const normalized = text.trim()
  if (!normalized) return 0

  const charsPerLine = Math.max(
    8,
    Math.floor(availableWidth / APPROX_CHAR_WIDTH),
  )

  let lines = 1
  let currentLength = 0

  for (const word of normalized.split(/\s+/)) {
    const wordLength = word.length

    if (currentLength === 0) {
      currentLength = wordLength
      continue
    }

    if (currentLength + 1 + wordLength <= charsPerLine) {
      currentLength += 1 + wordLength
      continue
    }

    lines += 1
    currentLength = wordLength

    if (lines >= maxLines) return maxLines
  }

  return Math.min(lines, maxLines)
}

function estimateLabelHeight(item: PinCardData, columnWidth: number): number {
  const availableWidth = Math.max(1, columnWidth - LABEL_SIDE_PADDING * 2)

  // Case / Episode: título automático + dato secundario en negrita.
  if (item.displayTitle) {
    const primaryLines = estimateWrappedLines(
      item.displayTitle,
      availableWidth,
      2,
    )
    const secondaryLines = item.displaySecondary ? 1 : 0

    return (
      LABEL_TOP_GAP +
      primaryLines * LABEL_LINE_HEIGHT +
      (secondaryLines > 0
        ? LABEL_SECONDARY_GAP + secondaryLines * LABEL_LINE_HEIGHT
        : 0) +
      LABEL_SAFETY
    )
  }

  // Tool / Insight / Other: gancho libre del admin, máximo dos líneas.
  if (item.label) {
    const lines = estimateWrappedLines(item.label, availableWidth, 2)
    return LABEL_TOP_GAP + lines * LABEL_LINE_HEIGHT + LABEL_SAFETY
  }

  // No hay texto bajo el medio: no reservar el antiguo alto por defecto.
  return 0
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
