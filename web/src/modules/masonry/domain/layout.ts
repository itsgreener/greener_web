/**
 * Layout de masonry, módulo de dominio puro (arquitectura §24.4): calcula
 * la posición (columna, x, y) de cada pin sin tocar el DOM. La altura se
 * deriva del ratio cerrado del pin (brief §3), no se mide — así se puede
 * reservar el espacio antes de la descarga del medio (§9.2, §10.1) y
 * posicionar con `transform` en vez de dejar que el navegador reflowee.
 */

export type PinRatio = '1:1' | '4:3' | '4:5' | '3:4' | '2:3' | '9:16' | '16:9'

const RATIO_HEIGHT_FACTOR: Record<PinRatio, number> = {
  '1:1': 1,
  '4:3': 3 / 4,
  '4:5': 5 / 4,
  '3:4': 4 / 3,
  '2:3': 3 / 2,
  '9:16': 16 / 9,
  '16:9': 9 / 16,
}

/** Altura del medio (sin rótulo) para un ancho de columna dado. */
export function heightForRatio(ratio: PinRatio, columnWidth: number): number {
  return Math.round(columnWidth * RATIO_HEIGHT_FACTOR[ratio])
}

/**
 * Columnas por breakpoint — arquitectura §10.1. Propuesta técnica, a validar
 * por diseño. El valor que se compara es el ANCHO DEL CONTENEDOR del feed
 * (viewport − 64 px de menú − 32 de padding), no el del viewport.
 */
export const BREAKPOINTS = [
  { maxWidth: 640, columns: 2 },
  { maxWidth: 900, columns: 3 },
  { maxWidth: 1200, columns: 4 },
  // Escritorio: 6 columnas a partir de 1200 (decisión de Greener, 2 oct
  // 2026). Antes había un tramo intermedio de 5 columnas entre 1200 y 1600
  // que ya no tiene hueco: ver PROGRESO §2.28.
  { maxWidth: Infinity, columns: 6 },
] as const

export function columnsForViewport(viewportWidth: number): number {
  for (const bp of BREAKPOINTS) {
    if (viewportWidth < bp.maxWidth) return bp.columns
  }
  return BREAKPOINTS[BREAKPOINTS.length - 1].columns
}

export interface LayoutInputItem {
  id: string
  ratio: PinRatio
  /** Alto estimado del rótulo bajo el pin (brief §3), constante por simplicidad del prototipo. */
  labelHeight?: number
}

export interface LayoutPosition {
  id: string
  column: number
  x: number
  y: number
  width: number
  height: number // solo el medio, sin el rótulo
}

export interface LayoutResult {
  positions: LayoutPosition[]
  /** Alto total de la retícula — para reservar espacio del contenedor. */
  totalHeight: number
  columnCount: number
}

const DEFAULT_LABEL_HEIGHT = 28
export const GAP = 12

/**
 * Asigna cada item a la columna con menor altura acumulada (shortest-column-
 * first). Determinista: mismo input, mismo output — no depende de medición
 * de DOM ni de orden de llegada asíncrono.
 *
 * `initialColumnHeights` (opcional, especificacion-final-formato-detalle.md
 * §2): permite sembrar cada columna con una altura de partida distinta de 0,
 * en vez de arrancar todas a la vez. Es el mecanismo que hace posible el
 * panel de recomendaciones de tipo A/B sin ningún caso especial: las
 * columnas que reserva el bloque de contenido (imagen+texto) se siembran a
 * su altura real, las columnas de recomendación a 0 — el propio algoritmo
 * shortest-column-first rellena primero las columnas más cortas (las de
 * recomendación, "a la derecha") y, en cuanto su altura acumulada alcanza
 * la del bloque de contenido, empieza a usar también esas columnas
 * "liberadas" — que es exactamente el comportamiento de "recomendaciones a
 * la derecha + debajo" sin necesidad de dos retículas independientes ni de
 * detectar a mano cuándo termina el bloque de contenido.
 *
 * Si se pasa, debe traer una entrada por columna (`columnCount`); una
 * columna sin entrada se siembra a 0. Quien siembre debe sumar `GAP` a la
 * altura real del bloque de contenido si quiere el mismo margen visual que
 * el algoritmo deja entre el resto de tarjetas — esta función no lo añade
 * por su cuenta, para no asumir que todo el que siembra alturas quiere
 * necesariamente ese hueco.
 */
export function computeMasonryLayout(
  items: LayoutInputItem[],
  containerWidth: number,
  columnCount: number,
  initialColumnHeights?: number[],
): LayoutResult {
  const safeColumnCount = Math.max(1, columnCount)
  const columnWidth =
    (containerWidth - GAP * (safeColumnCount - 1)) / safeColumnCount
  const columnHeights = new Array(safeColumnCount)
    .fill(0)
    .map((_, c) => initialColumnHeights?.[c] ?? 0)
  const positions: LayoutPosition[] = []

  for (const item of items) {
    // Columna con menor altura acumulada; en empate, la de menor índice
    // (determinismo estable, no depende del orden de iteración de Math.min).
    let targetColumn = 0
    for (let c = 1; c < safeColumnCount; c++) {
      if (columnHeights[c] < columnHeights[targetColumn]) targetColumn = c
    }

    const mediaHeight = heightForRatio(item.ratio, columnWidth)
    const labelHeight = item.labelHeight ?? DEFAULT_LABEL_HEIGHT
    const cardHeight = mediaHeight + labelHeight

    const x = targetColumn * (columnWidth + GAP)
    const y = columnHeights[targetColumn]

    positions.push({
      id: item.id,
      column: targetColumn,
      x,
      y,
      width: columnWidth,
      height: mediaHeight,
    })

    columnHeights[targetColumn] = y + cardHeight + GAP
  }

  return {
    positions,
    totalHeight: Math.max(0, ...columnHeights),
    columnCount: safeColumnCount,
  }
}
