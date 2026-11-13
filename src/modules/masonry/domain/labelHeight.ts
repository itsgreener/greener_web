/**
 * Alto estimado del rótulo bajo un pin. Lo comparten el feed (useMasonryPositions)
 * y el panel de recomendaciones de los detalles (useRecommendationMasonry).
 *
 * Debe mantenerse coordinado con PinCard.module.css:
 * - padding horizontal del texto: 12px por lado
 * - margin-top del texto: 8px
 * - font-size: --fs-card = 0.8rem (12.8px sobre base 16); desde 1920 px de
 *   viewport (BREAKPOINT_PX.fullHd) 0.9rem (14.4px)
 * - line-height: 1.3 ≈ 16.64px (18.72px desde 1920 px)
 * - separación title/secondary: 2px
 *
 * El layout es absoluto: si no se reserva aquí el alto REALISTA del texto,
 * la siguiente tarjeta empieza antes de que termine el rótulo.
 */

import { BREAKPOINT_PX } from '@/modules/shared/domain/breakpoints'

const LABEL_SIDE_PADDING = 12
export const LABEL_TOP_GAP = 8
export const LABEL_LINE_HEIGHT = 17
export const LABEL_SECONDARY_GAP = 2
export const LABEL_SAFETY = 2
const APPROX_CHAR_WIDTH = 6.5

/** Desde 1920 px de viewport el texto es 0.9rem: 14.4 / 12.8 = 1.125. */
export const LABEL_FULL_HD_FONT_SCALE = 1.125
export const LABEL_LINE_HEIGHT_FULL_HD = 19

export interface LabelMetrics {
  lineHeight: number
  charWidth: number
}

/**
 * Medidas del rótulo según el ancho del viewport. El `@media (min-width:
 * 1920px)` de globals.css y esta función deben cortar en el mismo punto.
 */
export function labelMetrics(viewportWidth?: number): LabelMetrics {
  if (viewportWidth !== undefined && viewportWidth >= BREAKPOINT_PX.fullHd) {
    return {
      lineHeight: LABEL_LINE_HEIGHT_FULL_HD,
      charWidth: APPROX_CHAR_WIDTH * LABEL_FULL_HD_FONT_SCALE,
    }
  }

  return { lineHeight: LABEL_LINE_HEIGHT, charWidth: APPROX_CHAR_WIDTH }
}

/** Campos del pin que deciden qué rótulo se pinta. */
export interface LabelHeightInput {
  displayTitle?: string | null
  displaySecondary?: string | null
  label?: string | null
}

export function estimateWrappedLines(
  text: string,
  availableWidth: number,
  maxLines: number,
  charWidth: number = APPROX_CHAR_WIDTH,
): number {
  const normalized = text.trim()
  if (!normalized) return 0

  const charsPerLine = Math.max(
    8,
    Math.floor(availableWidth / charWidth),
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

export function estimateLabelHeight(
  item: LabelHeightInput,
  columnWidth: number,
  viewportWidth?: number,
): number {
  const { lineHeight, charWidth } = labelMetrics(viewportWidth)
  const availableWidth = Math.max(1, columnWidth - LABEL_SIDE_PADDING * 2)

  // Case / Episode: título automático + dato secundario.
  if (item.displayTitle) {
    const primaryLines = estimateWrappedLines(
      item.displayTitle,
      availableWidth,
      2,
      charWidth,
    )
    const secondaryLines = item.displaySecondary ? 1 : 0

    return (
      LABEL_TOP_GAP +
      primaryLines * lineHeight +
      (secondaryLines > 0
        ? LABEL_SECONDARY_GAP + secondaryLines * lineHeight
        : 0) +
      LABEL_SAFETY
    )
  }

  // Tool / Insight / Other: gancho libre del admin, máximo dos líneas.
  if (item.label) {
    const lines = estimateWrappedLines(
      item.label,
      availableWidth,
      2,
      charWidth,
    )
    return LABEL_TOP_GAP + lines * lineHeight + LABEL_SAFETY
  }

  // No hay texto bajo el medio: no se reserva nada.
  return 0
}
