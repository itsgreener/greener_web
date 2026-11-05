/**
 * Alto estimado del rótulo bajo un pin. Lo comparten el feed (useMasonryPositions)
 * y el panel de recomendaciones de los detalles (useRecommendationMasonry).
 *
 * Debe mantenerse coordinado con PinCard.module.css:
 * - padding horizontal del texto: 12px por lado
 * - margin-top del texto: 8px
 * - font-size: 0.8rem = 12.8px sobre base 16
 * - line-height: 1.3 ≈ 16.64px
 * - separación title/secondary: 2px
 *
 * El layout es absoluto: si no se reserva aquí el alto REALISTA del texto,
 * la siguiente tarjeta empieza antes de que termine el rótulo.
 */

const LABEL_SIDE_PADDING = 12
export const LABEL_TOP_GAP = 8
export const LABEL_LINE_HEIGHT = 17
export const LABEL_SECONDARY_GAP = 2
export const LABEL_SAFETY = 2
const APPROX_CHAR_WIDTH = 6.5

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

export function estimateLabelHeight(
  item: LabelHeightInput,
  columnWidth: number,
): number {
  const availableWidth = Math.max(1, columnWidth - LABEL_SIDE_PADDING * 2)

  // Case / Episode: título automático + dato secundario.
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

  // Tool / Insight / Other: gancho libre del admin, máximo dos líneas.
  if (item.label) {
    const lines = estimateWrappedLines(item.label, availableWidth, 2)
    return LABEL_TOP_GAP + lines * LABEL_LINE_HEIGHT + LABEL_SAFETY
  }

  // No hay texto bajo el medio: no se reserva nada.
  return 0
}
