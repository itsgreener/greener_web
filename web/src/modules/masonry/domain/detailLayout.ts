import {
  RATIO_DECIMAL_VALUE,
  type PinRatioValue,
} from '@/modules/media/domain/closestRatio'

/**
 * especificacion-final-formato-detalle.md §2 — el modelo de columnas de
 * una página de detalle, verificado por medición de píxeles directa
 * sobre capturas reales, no una fórmula inventada. Las dos tablas del
 * documento (la de 6 columnas y la "aproximación" para 5/4/3) están
 * transcritas literalmente aquí como tabla de consulta — no se
 * interpolan en código porque el propio documento ya deja claro que la
 * interpolación es suya, hecha a mano, no un cálculo continuo.
 */

type RatioGroup = 'panoramica' | 'ancha' | 'vertical'

const RATIO_GROUP: Record<PinRatioValue, RatioGroup> = {
  '16:9': 'panoramica',
  '1:1': 'ancha',
  '4:3': 'ancha',
  '4:5': 'vertical',
  '3:4': 'vertical',
  '2:3': 'vertical',
  '9:16': 'vertical',
}

// Columnas de RECOMENDACIÓN (no de contenido) por grupo y ancho total —
// tabla base de 6 columnas (§2, primera tabla) + aproximación para 5/4/3
// (§2, segunda tabla). El contenido siempre es "lo que sobra"
// (totalColumns - recomendación), nunca al revés.
const RECOMMENDATION_COLUMNS: Record<RatioGroup, Record<number, number>> = {
  panoramica: { 6: 1, 5: 1, 4: 0, 3: 0 },
  ancha: { 6: 2, 5: 2, 4: 1, 3: 0 },
  vertical: { 6: 3, 5: 2, 4: 1, 3: 1 },
}

export interface ColumnReservation {
  contentColumns: number
  recommendationColumns: number
}

/**
 * Cuántas columnas reserva el bloque de contenido (imagen+texto) y
 * cuántas quedan libres para el panel de recomendaciones, a un ancho
 * total de columnas dado.
 *
 * Por debajo de 3 columnas totales (móvil, <640px) el documento deja el
 * móvil explícitamente fuera de esta tabla ("diseño entrega un
 * rediseño propio aparte") — aquí se resuelve como caso base sin panel
 * lateral (todo el ancho para el contenido, 0 de recomendación), que es
 * el placeholder acordado hasta que exista ese rediseño. Para tipo B
 * (caso/episodio), que siempre reserva 6/6 sin importar el ratio, el
 * llamador simplemente no usa esta función — pasa por el mismo camino
 * genérico sembrando todas las columnas por igual (ver
 * useRecommendationMasonry).
 */
export function columnReservationForRatio(
  ratio: PinRatioValue,
  totalColumns: number,
): ColumnReservation {
  if (totalColumns <= 2) {
    return { contentColumns: totalColumns, recommendationColumns: 0 }
  }

  const group = RATIO_GROUP[ratio]
  const recommendationColumns = RECOMMENDATION_COLUMNS[group][totalColumns] ?? 0

  return {
    contentColumns: totalColumns - recommendationColumns,
    recommendationColumns,
  }
}

export interface ContentBlockDimensions {
  width: number
  height: number
}

/**
 * Ancho y alto reales de la imagen del bloque de contenido (§2, puntos 1
 * y 2): altura fija 66,7vh × ratio, con tope del 83% del ancho útil de
 * contenido — si el ancho natural supera ese tope, se recorta la ALTURA
 * renderizada (nunca el ratio, que se respeta siempre).
 */
export function contentBlockImageDimensions(
  ratio: PinRatioValue,
  availableContentWidthPx: number,
  viewportHeightPx: number,
): ContentBlockDimensions {
  const naturalHeight = viewportHeightPx * 0.667
  const naturalWidth = naturalHeight * RATIO_DECIMAL_VALUE[ratio]
  const widthCap = availableContentWidthPx * 0.83

  if (naturalWidth <= widthCap) {
    return { width: naturalWidth, height: naturalHeight }
  }

  return { width: widthCap, height: widthCap / RATIO_DECIMAL_VALUE[ratio] }
}

/**
 * Móvil (<640px, <3 columnas totales) — placeholder acordado el 21 sep:
 * la tabla de columnas del §2 deja el móvil fuera a propósito ("diseño
 * entrega un rediseño propio aparte"), así que aquí no tiene sentido
 * fingir que existe un panel lateral con el que coordinarse. La imagen
 * va a su ratio natural, a todo el ancho disponible — sin la regla de
 * 66,7vh de altura fija, que solo existe para poder repartir columnas
 * junto a un panel lateral que en móvil no existe.
 */
export function mobileContentImageDimensions(
  ratio: PinRatioValue,
  availableWidthPx: number,
): ContentBlockDimensions {
  return {
    width: availableWidthPx,
    height: availableWidthPx / RATIO_DECIMAL_VALUE[ratio],
  }
}
