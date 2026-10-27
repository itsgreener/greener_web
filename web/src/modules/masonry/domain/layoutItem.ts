import { estimateLabelHeight, type LabelHeightInput } from './labelHeight'
import type { LayoutInputItem, PinRatio } from './layout'

/**
 * Piezas puras que comparten el feed (`useMasonryPositions`) y el panel de
 * recomendaciones de los detalles (`useRecommendationMasonry`).
 */

/**
 * Identidad de ESTA tarjeta en la lista, única aunque el mismo pin salga
 * varias veces (el feed es infinito y recicla pines). La lista solo crece
 * por el final y un ítem nunca cambia de posición, así que el índice global
 * es una clave estable; el `pinId` se añade solo para poder leerla en las
 * DevTools. NUNCA usar `item.pinId` como key.
 */
export function masonryKey(index: number, pinId: string): string {
  return `${index}:${pinId}`
}

/** Lo que hace falta de un pin para colocarlo. */
export interface MasonryPinInput extends LabelHeightInput {
  pinId: string
  ratio: string
}

/** Pin del feed → entrada del layout, con el alto de su rótulo estimado. */
export function toLayoutItem(
  item: MasonryPinInput,
  columnWidth: number,
): LayoutInputItem {
  return {
    id: item.pinId,
    ratio: item.ratio as PinRatio,
    labelHeight: estimateLabelHeight(item, columnWidth),
  }
}
