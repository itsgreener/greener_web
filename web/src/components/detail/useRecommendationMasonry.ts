'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  FeedBatchItem,
  FeedBatchResult,
} from '@/modules/feed/application/getFeedSessionBatch'
import {
  computeMasonryLayout,
  columnsForViewport,
  GAP,
  type LayoutInputItem,
  type PinRatio,
} from '@/modules/masonry/domain/layout'
import {
  columnReservationForRatio,
  computeContentBlockGeometry,
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
 * - El scope lo decide la sección que abre el detalle: tools → tools,
 *   insights → insights, channel → channel, work → work y home → todo.
 *   El contenido actual se excluye siempre para no recomendarse a sí mismo.
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

export type RecommendationScope =
  'home' | 'work' | 'insights' | 'tools' | 'channel'

async function openRecommendationSession(
  excludeContentId: string,
  scope: RecommendationScope,
): Promise<string> {
  const res = await fetch('/api/feed/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, excludeContentId }),
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

/*
 * Mismas métricas visuales que PinCard.module.css y useMasonryPositions:
 * el panel de recomendaciones usa el MISMO PinCard, así que también debe
 * reservar el alto realista del texto. Si no, en detalle de Tool/Insight/
 * Other/Case/Episode la siguiente tarjeta se coloca como si el rótulo
 * midiera siempre 28px y acaba visualmente demasiado cerca.
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

function estimateLabelHeight(item: FeedBatchItem, columnWidth: number): number {
  const availableWidth = Math.max(1, columnWidth - LABEL_SIDE_PADDING * 2)

  // Case / Episode: título automático + cliente/tipo de episodio.
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

  // Tool / Insight / Other: frase gancho introducida por el admin.
  if (item.label) {
    const lines = estimateWrappedLines(item.label, availableWidth, 2)
    return LABEL_TOP_GAP + lines * LABEL_LINE_HEIGHT + LABEL_SAFETY
  }

  return 0
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
    // Tipo A (tool/insight/other): el texto conserva como MÍNIMO una
    // columna de la retícula. Si la imagen deja más hueco dentro del bloque
    // reservado, el texto aprovecha todo ese resto (ver
    // computeContentBlockGeometry). Casos y episodios no lo activan.
    textColumn?: boolean
    // Universo de recomendaciones. 'home' mezcla todo; cada subhome
    // restringe a su tipo de contenido.
    scope?: RecommendationScope
  },
) {
  const scope = options?.scope ?? 'home'

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

    // Si navegamos entre detalles sin desmontar el componente, no deben
    // sobrevivir pines ni cursor de la sección anterior. Diferido con
    // queueMicrotask para no llamar a setState de forma síncrona en el
    // cuerpo del efecto (react-hooks/set-state-in-effect; mismo patrón que
    // useFeed.ts y useVideoSlot.ts). Corre antes de que vuelva el fetch de
    // abajo, así que nunca pisa la sesión nueva.
    queueMicrotask(() => {
      if (cancelled) return
      setSessionId(null)
      setItems([])
      setCursor(null)
      setHasMore(true)
      setError(null)
    })

    openRecommendationSession(excludeContentId, scope)
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
  }, [excludeContentId, scope])

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

  const textColumn = options?.textColumn ?? false

  const contentBlock = useMemo(
    () =>
      computeContentBlockGeometry({
        containerWidth,
        viewportHeight,
        ratio,
        totalColumns,
        contentColumns,
        textColumn,
      }),
    [
      containerWidth,
      viewportHeight,
      totalColumns,
      contentColumns,
      ratio,
      textColumn,
    ],
  )

  const layout = useMemo(() => {
    if (containerWidth === 0 || contentBlock.imageHeight === 0) return null
    const columnWidth =
      (containerWidth - GAP * (totalColumns - 1)) / totalColumns

    const layoutItems: LayoutInputItem[] = items.map((item) => ({
      id: item.pinId,
      ratio: item.ratio as PinRatio,
      labelHeight: estimateLabelHeight(item, columnWidth),
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
      .map((_, c) => (c < contentColumns ? contentBlock.imageHeight + GAP : 0))
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
    contentBlockTextWidth: contentBlock.textColumnWidth,
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
