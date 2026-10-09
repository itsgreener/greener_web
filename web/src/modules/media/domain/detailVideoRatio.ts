import { closestClosedRatio } from './closestRatio'
import type { PinRatioValue } from '@/modules/shared/domain/ratio'
/**
 * Ratio con el que se calcula el escalón M del vídeo de una ficha.
 *
 * FUENTE ÚNICA entre la ENTREGA (los componentes de detalle) y el
 * CALENTAMIENTO (fase 2, contrato-medios-fase-1.md §9.4): si las dos
 * calcularan el ratio por separado y alguna vez discreparan, las cadenas
 * del eager no coincidirían con las URL pedidas, el calentamiento no
 * serviría de nada y cada versión se pagaría dos veces. Por eso estas dos
 * funciones son lo único que decide el ratio y las usan ambos lados.
 */

/**
 * Ratio por defecto cuando una ficha de tool/insight/other no trae ratio:
 * el caso «vertical» más conservador (especificacion-final-formato-
 * detalle.md §2).
 */
export const TOOL_INSIGHT_FALLBACK_RATIO: PinRatioValue = '4:5'

/**
 * Ficha de tool / insight / other. En una tool el ratio es el del PIN
 * abierto con `?pin=` (`override`: desde el 7 oct las tools no tienen
 * portada propia); en `other`, el de su portada (`coverRatio`).
 */
export function toolInsightDetailRatio(
  override: PinRatioValue | null | undefined,
  coverRatio: PinRatioValue | null | undefined,
): PinRatioValue {
  return override ?? coverRatio ?? TOOL_INSIGHT_FALLBACK_RATIO
}

/** Vídeo del carrusel de un caso: el ratio cerrado más cercano al PROPIO vídeo. */
export function caseVideoRatio(width: number, height: number): PinRatioValue {
  return closestClosedRatio(width, height)
}
