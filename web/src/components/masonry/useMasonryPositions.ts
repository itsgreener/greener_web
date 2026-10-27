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
  computeBatchBounds,
  computeMountedRange,
  type BatchBounds,
  type MountedRange,
} from '@/modules/masonry/domain/virtualization'
import { masonryKey, toLayoutItem } from '@/modules/masonry/domain/layoutItem'
import type { PinCardData } from '@/components/pin/PinCard'
import type { FeedNewsletterItem } from '@/modules/feed/domain/feedReadModels'
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

/**
 * Lo que el masonry sabe colocar: un pin o la tarjeta de newsletter, que no
 * lleva rótulo debajo y tiene proporción fija 4:5.
 */
export type MasonryEntry = PinCardData | FeedNewsletterItem

const NEWSLETTER_CARD_RATIO: PinRatio = '4:5'

function isNewsletterEntry(entry: MasonryEntry): entry is FeedNewsletterItem {
  return 'kind' in entry && entry.kind === 'newsletter'
}

export interface PositionedPin<T extends MasonryEntry = MasonryEntry> {
  /** Identidad de ESTA tarjeta en la lista (ver `masonryKey`). */
  key: string
  item: T
  x: number
  y: number
  width: number
  height: number
  mounted: boolean
}

/**
 * Lote de cada pin, en el mismo orden que `items`. Si `batchSizes` no cubre
 * todos los pines (no debería pasar), los sobrantes cuentan como del último.
 */
function batchIndexByItem(count: number, batchSizes: number[]): number[] {
  const result: number[] = []
  for (let b = 0; b < batchSizes.length; b++) {
    for (let k = 0; k < batchSizes[b] && result.length < count; k++) {
      result.push(b)
    }
  }
  const last = Math.max(0, batchSizes.length - 1)
  while (result.length < count) result.push(last)
  return result
}

/**
 * Colchón de montaje, en alturas de viewport, por encima y por debajo de lo
 * visible. Con dos viewports de margen se montan unos cinco viewports de
 * contenido (unos 2-3 lotes), suficiente para que no se vea nada vacío al
 * scrollear rápido y para que el prefetch de imágenes llegue a tiempo.
 */
const MOUNT_MARGIN_VIEWPORTS = 2

/** Antes de medir nada se montan los dos primeros lotes (la primera pantalla). */
const INITIAL_MOUNTED_RANGE: MountedRange = { first: 0, last: 1 }

export function useMasonryPositions<T extends MasonryEntry>(
  items: T[],
  batchSizes: number[],
) {
  const { containerRef, containerWidth } = useContainerWidth()

  const columnCount = columnsForViewport(containerWidth || 1200)

  const layoutItems = useMemo<LayoutInputItem[]>(() => {
    if (containerWidth === 0) return []

    const columnWidth = (containerWidth - GAP * (columnCount - 1)) / columnCount

    return items.map((item) =>
      isNewsletterEntry(item)
        ? {
            id: item.pinId,
            ratio: NEWSLETTER_CARD_RATIO,
            labelHeight: 0,
          }
        : toLayoutItem(item, columnWidth),
    )
  }, [items, containerWidth, columnCount])

  const layout = useMemo(() => {
    if (containerWidth === 0) return null
    return computeMasonryLayout(layoutItems, containerWidth, columnCount)
  }, [layoutItems, containerWidth, columnCount])

  // Franja vertical real de cada lote (rótulo incluido). Los lotes se solapan
  // en vertical, así que no se pueden ordenar sumando alturas: ver
  // `virtualization.ts`.
  const batchBounds = useMemo<BatchBounds[]>(() => {
    if (!layout) return []

    return computeBatchBounds(
      layout.positions.map((position, index) => ({
        y: position.y,
        height: position.height,
        labelHeight: layoutItems[index]?.labelHeight ?? 0,
      })),
      batchSizes,
    )
  }, [layout, layoutItems, batchSizes])

  // Lotes montados. El estado solo cambia cuando cambia el RANGO, no en cada
  // frame de scroll: guardar aquí el scroll en píxeles re-renderizaba el feed
  // entero (y todas las tarjetas montadas) en cada frame. Se recalcula al
  // scrollear, al cambiar el tamaño de la ventana y cuando cambia el layout
  // (llega un lote, se retira la newsletter, cambian las columnas).
  const [mountedRange, setMountedRange] = useState<MountedRange>(
    INITIAL_MOUNTED_RANGE,
  )

  useEffect(() => {
    let raf = 0

    const update = () => {
      // Sin lotes (aún sin ancho o sin pines) se conserva el rango inicial: con
      // un rango vacío, el primer layout se pintaría un frame sin ningún pin.
      if (batchBounds.length === 0) return

      // La posición del contenedor en el documento se mide con el rect, no
      // con `offsetTop`, que es relativo al primer ancestro posicionado.
      const containerTop = containerRef.current
        ? containerRef.current.getBoundingClientRect().top + window.scrollY
        : 0
      const viewportTop = window.scrollY - containerTop
      const viewportHeight = window.innerHeight

      const next = computeMountedRange(
        batchBounds,
        viewportTop,
        viewportTop + viewportHeight,
        viewportHeight * MOUNT_MARGIN_VIEWPORTS,
      )

      setMountedRange((prev) =>
        prev.first === next.first && prev.last === next.last ? prev : next,
      )
    }

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(raf)
    }
  }, [containerRef, batchBounds])

  const positioned: PositionedPin<T>[] = useMemo(() => {
    if (!layout) return []

    const batchOfItem = batchIndexByItem(items.length, batchSizes)

    return layout.positions.map((pos, index) => {
      const batchIndex = batchOfItem[index]
      return {
        key: masonryKey(index, items[index].pinId),
        item: items[index],
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        mounted:
          batchIndex >= mountedRange.first && batchIndex <= mountedRange.last,
      }
    })
  }, [layout, items, batchSizes, mountedRange])

  return {
    containerRef,
    positioned,
    totalHeight: layout?.totalHeight ?? 0,
  }
}
