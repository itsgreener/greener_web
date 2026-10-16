'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  isPinItem,
  type FeedPinItem,
} from '@/modules/feed/domain/feedReadModels'
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
import { estimateLabelHeight } from '@/modules/masonry/domain/labelHeight'
import type { PinRatioValue } from '@/modules/shared/domain/ratio'
import { fetchFeedBatch, openFeedSession } from '@/components/masonry/feedApi'
import { useContainerWidth } from '@/components/masonry/useContainerWidth'
import { useSentinel } from '@/components/masonry/useSentinel'
import { recommendationsCopy } from './copy'

/**
 * Panel de recomendaciones de una página de detalle
 * (especificacion-final-formato-detalle.md §1, §2, §6) — deliberadamente
 * NO es una variante de useFeed/FeedProvider:
 *
 * - Sin persistencia entre navegaciones: cada
 *   entrada a un detalle pide una feedSession nueva, no hay scope que
 *   guardar en sessionStorage ni scroll que restaurar.
 * - El scope es SIEMPRE `home` (decisión del 14 oct 2026): las
 *   recomendaciones de cualquier ficha mezclan todos los tipos, igual que la
 *   home, y no se limitan al tipo de contenido que se ha abierto. El
 *   contenido actual se excluye siempre para no recomendarse a sí mismo.
 * - Tipo A (tool/insight/other): el bloque de contenido va en absoluto
 *   DENTRO del lienzo y el masonry se siembra de forma asimétrica: las
 *   primeras `contentColumns` columnas arrancan a la altura de la imagen
 *   (+GAP), el resto a 0 — ver computeMasonryLayout, initialColumnHeights.
 * - Tipo B (caso/episodio, `fullWidthContent`): el bloque de contenido va
 *   en flujo normal ENCIMA del lienzo y el lienzo solo contiene las
 *   recomendaciones, sembradas a 0: el navegador calcula la altura real del
 *   bloque y el margen es un `margin-bottom` de CSS.
 * - Sin virtualización ni prefetch por sentinel: con lotes de 40 pines
 *   montar todo no tiene el coste del scroll infinito de home/subhomes.
 */

/** Universo de las recomendaciones de una ficha: toda la home. */
const RECOMMENDATIONS_SCOPE = 'home'

export interface PositionedRecommendation {
  /**
   * Identidad de ESTA tarjeta en la lista, única aunque el mismo pin salga
   * varias veces (el feed es infinito y recicla pines: ver PROGRESO). La
   * lista solo crece por el final y un ítem nunca cambia de posición, así
   * que el índice global es una clave estable; el pinId se añade solo para
   * poder leerla en las DevTools. NUNCA usar `item.pinId` como key.
   */
  key: string
  item: FeedPinItem
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
    // Con esto activado el bloque de contenido va EN FLUJO, fuera del
    // lienzo (el componente lo renderiza antes de `containerRef`), y el
    // lienzo solo contiene las recomendaciones, todas las columnas
    // sembradas a 0: solo pueden aparecer debajo, nunca al lado
    // (recommendationColumns siempre 0). `totalHeight` es entonces solo la
    // altura del masonry.
    fullWidthContent?: boolean
    // Tipo A (tool/insight/other): el texto conserva como MÍNIMO una
    // columna de la retícula. Si la imagen deja más hueco dentro del bloque
    // reservado, el texto aprovecha todo ese resto (ver
    // computeContentBlockGeometry). Casos y episodios no lo activan.
    textColumn?: boolean
  },
) {
  const scope = RECOMMENDATIONS_SCOPE

  const { containerRef, containerWidth } = useContainerWidth()
  const [viewportHeight, setViewportHeight] = useState(0)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [items, setItems] = useState<FeedPinItem[]>([])
  // Ref, no estado: `loadMore` está memorizado y leería un cursor congelado
  // (auditoría 8 oct, P0-4: el panel pedía siempre la ronda 0).
  const cursorRef = useRef<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

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
      cursorRef.current = null
      setHasMore(true)
      setError(null)
    })

    openFeedSession(scope, excludeContentId)
      .then((id) => {
        if (!cancelled) setSessionId(id)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          setError(recommendationsCopy.loadError)
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
      const batch = await fetchFeedBatch(sessionId, cursorRef.current)
      // Límite de peticiones superado: temporal, no toca ni cursor ni hasMore.
      if (batch.rateLimited) return
      // Las recomendaciones nunca llevan interludios (sesión con exclusión),
      // pero el tipo del lote sí lo admite.
      setItems((prev) => [...prev, ...batch.items.filter(isPinItem)])
      cursorRef.current = batch.cursor
      // Mismo criterio que FeedProvider.appendBatch: una ronda vacía es
      // definitiva (generateRound es determinista), así que se deja de pedir.
      setHasMore(batch.items.length > 0 ? batch.hasMore : false)
    } catch (err) {
      console.error(err)
      setError(recommendationsCopy.loadError)
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
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

  // Tipo B: el bloque de contenido NO está dentro del lienzo (ver arriba).
  const contentInFlow = options?.fullWidthContent ?? false

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
    if (containerWidth === 0) return null
    // En tipo A la siembra depende de la altura de la imagen; en tipo B
    // (en flujo) no depende de nada del bloque.
    if (!contentInFlow && contentBlock.imageHeight === 0) return null
    const columnWidth =
      (containerWidth - GAP * (totalColumns - 1)) / totalColumns

    const layoutItems: LayoutInputItem[] = items.map((item) => ({
      id: item.pinId,
      ratio: item.ratio as PinRatio,
      labelHeight: estimateLabelHeight(item, columnWidth),
    }))
    // Límite conocido de TIPO A (tool/insight/other): la siembra usa la
    // altura de la IMAGEN (contentBlockImageDimensions, §2), no la altura
    // real medida del bloque completo (imagen + texto) — si el texto es
    // más alto que la imagen, la primera fila de recomendaciones de esas
    // columnas puede quedar ligeramente solapada. Tipo B no lo tiene: su
    // bloque va en flujo y se siembra a 0.
    const initialColumnHeights = contentInFlow
      ? undefined
      : new Array(totalColumns)
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
    contentInFlow,
  ])

  const positioned: PositionedRecommendation[] = useMemo(() => {
    if (!layout) return []
    return layout.positions.map((pos, index) => ({
      key: `${index}:${items[index].pinId}`,
      item: items[index],
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
    }))
  }, [layout, items])

  // Prefetch simple del siguiente lote al entrar en el último tramo
  // (§10.3) — mismo mecanismo que useFeed, sin sesión persistida.
  const sentinelRef = useSentinel(loadMore)

  return {
    containerRef,
    contentBlockImageWidth: contentBlock.imageWidth,
    contentBlockImageHeight: contentBlock.imageHeight,
    contentBlockReservedWidth: contentBlock.reservedWidth,
    contentBlockTextWidth: contentBlock.textColumnWidth,
    totalHeight: contentInFlow
      ? (layout?.totalHeight ?? 0)
      : Math.max(layout?.totalHeight ?? 0, contentBlock.imageHeight),
    recommendationColumns,
    positioned,
    isLoading,
    itemCount: items.length,
    hasMore,
    error,
    sentinelRef,
  }
}

export type RecommendationsState = ReturnType<typeof useRecommendationMasonry>
