'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FeedBatchItem, FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'
import {
  computeMasonryLayout,
  columnsForViewport,
  GAP,
  type LayoutInputItem,
  type PinRatio,
} from '@/modules/masonry/domain/layout'
import {
  columnReservationForRatio,
  contentBlockImageDimensions,
  mobileContentImageDimensions,
} from '@/modules/masonry/domain/detailLayout'
import type { PinRatioValue } from '@/modules/media/domain/closestRatio'

/**
 * Panel de recomendaciones de una página de detalle
 * (especificacion-final-formato-detalle.md §1, §2, §6) — deliberadamente
 * NO es una variante de useFeed/FeedProvider:
 *
 * - Sin persistencia entre navegaciones (decisión del 21 sep): cada
 *   entrada a un detalle pide una feedSession nueva, no hay scope que
 *   guardar en sessionStorage ni scroll que restaurar.
 * - scope siempre 'home' + excludeContentId siempre el propio contenido
 *   (§6: "aleatorias, igual que la home"; el contenido no se recomienda
 *   a sí mismo, arquitectura del 21 sep en getFeedDataset).
 * - El masonry se siembra de forma asimétrica: las primeras
 *   `contentColumns` columnas arrancan a la altura real del bloque de
 *   contenido (+GAP), el resto a 0 — ver computeMasonryLayout,
 *   initialColumnHeights. Con contentColumns === totalColumns (tipo B,
 *   "solo debajo", o el placeholder de móvil) esto degenera solo en
 *   "todas las columnas arrancan igual", sin ningún caso especial.
 * - Sin virtualización ni prefetch por sentinel todavía (v1 de este
 *   panel) — con lotes de 40 pines el coste de montar todo no es el
 *   mismo problema que en el scroll infinito de home/subhomes; se añade
 *   si hace falta cuando haya contenido real con el que medirlo.
 */

async function openRecommendationSession(
  excludeContentId: string,
): Promise<string> {
  const res = await fetch('/api/feed/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: 'home', excludeContentId }),
  })
  if (!res.ok) {
    throw new Error(
      `No se pudo abrir la sesión de recomendaciones: ${res.status}`,
    )
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
    throw new Error(`Fallo al pedir recomendaciones: ${res.status}`)
  }
  return res.json()
}

export interface PositionedRecommendation {
  item: FeedBatchItem
  x: number
  y: number
  width: number
  height: number
}

export function useRecommendationMasonry(
  excludeContentId: string,
  ratio: PinRatioValue,
  options?: {
    // especificacion-final-formato-detalle.md §1: tipo B (caso/episodio)
    // siempre reserva 6/6, nunca panel lateral — a diferencia de tipo A,
    // el ratio no decide cuántas columnas se reservan, siempre son todas.
    // Con esto activado, todas las columnas se siembran por igual tras
    // el bloque de contenido: las recomendaciones solo pueden aparecer
    // debajo, nunca al lado (recommendationColumns siempre 0).
    fullWidthContent?: boolean
  },
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [items, setItems] = useState<FeedBatchItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  // Ancho del contenedor (§10.1, mismo mecanismo que useMasonryPositions).
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

  // Alto de viewport para el 66,7vh del bloque de contenido (§2) — se
  // relee al redimensionar, igual que haría dvh en CSS.
  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    let cancelled = false
    openRecommendationSession(excludeContentId)
      .then((id) => {
        if (!cancelled) setSessionId(id)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo abrir las recomendaciones.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [excludeContentId])

  const loadMore = useCallback(async () => {
    if (!sessionId || loadingRef.current || !hasMore) return
    loadingRef.current = true
    setIsLoading(true)
    try {
      const batch = await fetchBatch(sessionId, cursor)
      setItems((prev) => [...prev, ...batch.items])
      setCursor(batch.cursor)
      setHasMore(batch.hasMore)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las recomendaciones.',
      )
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
    // cursor solo se lee dentro, no debe disparar una recarga por sí solo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, hasMore])

  useEffect(() => {
    if (sessionId && items.length === 0) {
      queueMicrotask(() => loadMore())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const totalColumns = columnsForViewport(containerWidth || 1200)
  const { contentColumns, recommendationColumns } = options?.fullWidthContent
    ? { contentColumns: totalColumns, recommendationColumns: 0 }
    : columnReservationForRatio(ratio, totalColumns)

  const contentBlock = useMemo(() => {
    if (containerWidth === 0 || viewportHeight === 0) {
      return { imageWidth: 0, imageHeight: 0, reservedWidth: 0 }
    }
    const columnWidth =
      (containerWidth - GAP * (totalColumns - 1)) / totalColumns
    const reservedWidth =
      contentColumns * columnWidth + GAP * (contentColumns - 1)
    // Móvil (§2: fuera de la tabla a propósito, "diseño entrega un
    // rediseño propio aparte") — placeholder del 21 sep: ratio natural a
    // ancho completo, sin la regla de 66,7vh (esa regla solo existe para
    // coordinarse con un panel lateral que en móvil no existe nunca).
    const image =
      totalColumns <= 2
        ? mobileContentImageDimensions(ratio, reservedWidth)
        : contentBlockImageDimensions(ratio, reservedWidth, viewportHeight)
    return {
      imageWidth: image.width,
      imageHeight: image.height,
      reservedWidth,
    }
  }, [containerWidth, viewportHeight, totalColumns, contentColumns, ratio])

  const layout = useMemo(() => {
    if (containerWidth === 0 || contentBlock.imageHeight === 0) return null
    const layoutItems: LayoutInputItem[] = items.map((i) => ({
      id: i.pinId,
      ratio: i.ratio as PinRatio,
    }))
    // Límite conocido de esta primera versión: la siembra usa la altura
    // de la IMAGEN (contentBlockImageDimensions, §2), no la altura real
    // medida del bloque completo (imagen + texto) — si el texto es más
    // alto que la imagen para un contenido con mucho summary, la primera
    // fila de recomendaciones de esas columnas puede quedar ligeramente
    // solapada. Medirlo con un ResizeObserver sobre el bloque real
    // arreglaría esto del todo, pero añade un ciclo más de render
    // (estimado → medido) — se deja fuera hasta que haya contenido real
    // con el que confirmar si el caso llega a darse en la práctica.
    const initialColumnHeights = new Array(totalColumns)
      .fill(0)
      .map((_, c) =>
        c < contentColumns ? contentBlock.imageHeight + GAP : 0,
      )
    return computeMasonryLayout(
      layoutItems,
      containerWidth,
      totalColumns,
      initialColumnHeights,
    )
  }, [
    items,
    containerWidth,
    totalColumns,
    contentColumns,
    contentBlock.imageHeight,
  ])

  const positioned: PositionedRecommendation[] = useMemo(() => {
    if (!layout) return []
    return layout.positions.map((pos, index) => ({
      item: items[index],
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
    }))
  }, [layout, items])

  // Prefetch simple del siguiente lote al entrar en el último tramo
  // (§10.3) — mismo mecanismo que useFeed, sin sesión persistida.
  useEffect(() => {
    const sentinel = document.getElementById(
      `greener-recommendations-sentinel-${excludeContentId}`,
    )
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '600px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [excludeContentId, loadMore])

  return {
    containerRef,
    contentBlockImageWidth: contentBlock.imageWidth,
    contentBlockImageHeight: contentBlock.imageHeight,
    contentBlockReservedWidth: contentBlock.reservedWidth,
    totalHeight: Math.max(layout?.totalHeight ?? 0, contentBlock.imageHeight),
    recommendationColumns,
    positioned,
    isLoading,
    itemCount: items.length,
    hasMore,
    error,
    sentinelId: `greener-recommendations-sentinel-${excludeContentId}`,
  }
}
