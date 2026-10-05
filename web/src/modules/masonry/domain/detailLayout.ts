import {
  RATIO_DECIMAL_VALUE,
  type PinRatioValue,
} from '@/modules/media/domain/closestRatio'
import { GAP } from './layout'

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
 * Hueco que ocupa el texto del bloque de contenido a su lado (tipo A): su
 * ancho y la separación con la imagen.
 */
export interface TextReserve {
  /** Ancho mínimo que debe quedar libre para el texto. */
  widthPx: number
  /** Separación entre la imagen y el texto (`gap` de `.contentBlock`). */
  gapPx: number
}

/**
 * Separación entre imagen y texto en `.contentBlock`
 * (ToolInsightDetail.module.css: `gap: var(--space-md)` = 16 px). Si el CSS
 * cambia, este valor debe cambiar con él; hay un test que lo vigila.
 */
export const CONTENT_BLOCK_TEXT_GAP_PX = 16

/**
 * Ancho y alto reales de la imagen del bloque de contenido (§2, puntos 1
 * y 2): altura fija 66,7vh × ratio, con tope del 83% del ancho útil de
 * contenido — si el ancho natural supera ese tope, se recorta la ALTURA
 * renderizada (nunca el ratio, que se respeta siempre).
 *
 * Con `textReserve` (tipo A) el tope pasa a ser el MENOR entre ese 83% y
 * «ancho útil − ancho mínimo de texto − hueco». La columna indicada aquí
 * es un MÍNIMO, no un máximo: si la imagen natural es más estrecha, todo el
 * espacio sobrante se entrega al texto. Sin `textReserve` el resultado es
 * el de siempre.
 */
export function contentBlockImageDimensions(
  ratio: PinRatioValue,
  availableContentWidthPx: number,
  viewportHeightPx: number,
  textReserve?: TextReserve,
): ContentBlockDimensions {
  const naturalHeight = viewportHeightPx * 0.667
  const naturalWidth = naturalHeight * RATIO_DECIMAL_VALUE[ratio]
  let widthCap = availableContentWidthPx * 0.83

  if (textReserve) {
    const leftForImage =
      availableContentWidthPx - textReserve.widthPx - textReserve.gapPx
    widthCap = Math.min(widthCap, Math.max(0, leftForImage))
  }

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

export interface ContentBlockGeometryInput {
  /** Ancho del contenedor del feed (no el del viewport). */
  containerWidth: number
  viewportHeight: number
  ratio: PinRatioValue
  totalColumns: number
  contentColumns: number
  /**
   * Tipo A (tool / insight / other): el texto debe conservar COMO MÍNIMO
   * una columna de la retícula. Si la imagen deja más espacio libre dentro
   * del bloque reservado, el texto ocupa todo ese resto. Casos y episodios
   * (tipo B) no lo activan.
   */
  textColumn?: boolean
}

export interface ContentBlockGeometry {
  imageWidth: number
  imageHeight: number
  reservedWidth: number
  /**
   * Ancho REAL disponible para el texto dentro del bloque reservado.
   * En tipo A nunca será menor que una columna; puede ser mayor cuando la
   * imagen natural deje espacio. 0 = no aplica (sin medir, tipo B, o móvil).
   */
  textColumnWidth: number
}

const EMPTY_GEOMETRY: ContentBlockGeometry = {
  imageWidth: 0,
  imageHeight: 0,
  reservedWidth: 0,
  textColumnWidth: 0,
}

/**
 * Geometría completa del bloque de contenido de una página de detalle:
 * ancho reservado, imagen y (tipo A) ancho real restante para el texto. Es la
 * fórmula que antes vivía dentro de `useRecommendationMasonry`, sacada al
 * dominio para poder probarla sin React.
 *
 * Móvil (<3 columnas, §2: fuera de la tabla a propósito): placeholder del
 * 21 sep — imagen a ancho completo y SIN la regla de una columna para el
 * texto (necesitaría apilar imagen y texto, que depende del rediseño móvil).
 */
export function computeContentBlockGeometry(
  input: ContentBlockGeometryInput,
): ContentBlockGeometry {
  const {
    containerWidth,
    viewportHeight,
    ratio,
    totalColumns,
    contentColumns,
    textColumn = false,
  } = input

  if (containerWidth === 0 || viewportHeight === 0) return EMPTY_GEOMETRY

  const columnWidth = (containerWidth - GAP * (totalColumns - 1)) / totalColumns
  const reservedWidth =
    contentColumns * columnWidth + GAP * (contentColumns - 1)

  if (totalColumns <= 2) {
    const image = mobileContentImageDimensions(ratio, reservedWidth)
    return {
      imageWidth: image.width,
      imageHeight: image.height,
      reservedWidth,
      textColumnWidth: 0,
    }
  }

  const image = contentBlockImageDimensions(
    ratio,
    reservedWidth,
    viewportHeight,
    textColumn
      ? { widthPx: columnWidth, gapPx: CONTENT_BLOCK_TEXT_GAP_PX }
      : undefined,
  )

  // El requisito de diseño es "nunca menos de una columna", no
  // "exactamente una columna". `contentBlockImageDimensions` ya ha
  // garantizado el mínimo reservando `columnWidth`; ahora entregamos al
  // texto TODO el espacio que realmente queda entre la imagen y el borde
  // derecho del bloque. Así, por ejemplo, un 1:1 que deja casi dos columnas
  // libres usa ambas, y el CTA queda en la esquina inferior derecha REAL de
  // la caja de texto en vez de adelantarse una columna.
  const textWidth = textColumn
    ? Math.max(
        columnWidth,
        reservedWidth - image.width - CONTENT_BLOCK_TEXT_GAP_PX,
      )
    : 0

  return {
    imageWidth: image.width,
    imageHeight: image.height,
    reservedWidth,
    textColumnWidth: textWidth,
  }
}
