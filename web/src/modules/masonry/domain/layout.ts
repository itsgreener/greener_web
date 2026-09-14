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

/** Columnas por breakpoint — arquitectura §10.1. Propuesta técnica, a validar por diseño. */
export const BREAKPOINTS = [
  { maxWidth: 640, columns: 2 },
  { maxWidth: 900, columns: 3 },
  { maxWidth: 1200, columns: 4 },
  { maxWidth: 1600, columns: 5 },
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
const GAP = 12

/**
 * Asigna cada item a la columna con menor altura acumulada (shortest-column-
 * first). Determinista: mismo input, mismo output — no depende de medición
 * de DOM ni de orden de llegada asíncrono.
 */
export function computeMasonryLayout(
  items: LayoutInputItem[],
  containerWidth: number,
  columnCount: number,
): LayoutResult {
  const safeColumnCount = Math.max(1, columnCount)
  const columnWidth =
    (containerWidth - GAP * (safeColumnCount - 1)) / safeColumnCount
  const columnHeights = new Array(safeColumnCount).fill(0)
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
