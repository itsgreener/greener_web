/**
 * Puntos visibles del carrusel de un caso: ventana deslizante de, como mucho,
 * `MAX_VISIBLE_DOTS` (acordado con Greener el 10 nov 2026). Con más
 * diapositivas que puntos, la fila no crece: el activo se mantiene en el
 * centro y los puntos del borde por el que aún quedan diapositivas se
 * encogen (`small` el extremo, `medium` el siguiente) para sugerir que la
 * serie continúa. Con pocas diapositivas se pintan todas, a tamaño normal.
 */

export const MAX_VISIBLE_DOTS = 7

export type DotSize = 'full' | 'medium' | 'small'

export interface VisibleDot {
  /** Posición de la diapositiva a la que lleva (desde 0). */
  index: number
  size: DotSize
}

export function visibleDots(
  count: number,
  active: number,
  max: number = MAX_VISIBLE_DOTS,
): VisibleDot[] {
  if (count <= 0) return []

  const current = Math.min(Math.max(active, 0), count - 1)
  const length = Math.min(count, max)
  // El activo al centro; la ventana se pega a los extremos de la serie.
  const start = Math.min(
    Math.max(current - Math.floor(length / 2), 0),
    count - length,
  )
  const moreBefore = start > 0
  const moreAfter = start + length < count

  return Array.from({ length }, (_, offset) => {
    const fromEnd = length - 1 - offset
    let size: DotSize = 'full'
    if ((moreBefore && offset === 0) || (moreAfter && fromEnd === 0)) {
      size = 'small'
    } else if ((moreBefore && offset === 1) || (moreAfter && fromEnd === 1)) {
      size = 'medium'
    }
    return { index: start + offset, size }
  })
}
