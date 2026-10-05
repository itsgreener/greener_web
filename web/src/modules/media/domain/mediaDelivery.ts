/**
 * Estrategia de entrega de medios: separa el original almacenado del
 * recurso realmente servido al usuario, priorizando bandwidth sobre
 * almacenamiento (política de subida y almacenamiento §3-4).
 *
 * El feed nunca sirve el archivo original: usa versiones optimizadas y,
 * en vídeo, un preview/thumbnail. El original se reserva para la página
 * de detalle o la reproducción explícita.
 */

export type MediaContext = 'feed' | 'detail'

export const IMAGE_DELIVERY = {
  feed: {
    // Anchos servidos en el feed, alineados con las columnas del masonry
    // (arquitectura §10.1: 2-6 columnas según breakpoint).
    widths: [320, 480, 640, 960] as const,
    quality: 'auto' as const,
    format: 'auto' as const,
  },
  detail: {
    widths: [960, 1440, 1920] as const,
    quality: 'auto' as const,
    format: 'auto' as const,
  },
} as const

/**
 * Ancho de entrega de un medio de detalle (imagen o vídeo) para una caja de
 * `cssWidthPx` píxeles CSS: el menor de los anchos de IMAGE_DELIVERY.detail
 * que cubre la caja a la densidad del dispositivo (con tope de 2×: más
 * densidad no se nota y en vídeo cuesta ancho de banda). Si la caja es más
 * ancha que el mayor, se usa el mayor. Reutiliza los anchos ya existentes en
 * vez de inventar una constante para el vídeo.
 */
export function pickDetailWidth(
  cssWidthPx: number,
  devicePixelRatio = 1,
): number {
  const widths = IMAGE_DELIVERY.detail.widths
  const density = Math.min(Math.max(devicePixelRatio || 1, 1), 2)
  const needed = Math.max(0, cssWidthPx) * density

  return widths.find((w) => w >= needed) ?? widths[widths.length - 1]
}

export const VIDEO_DELIVERY = {
  feed: {
    // En el feed nunca se sirve el vídeo completo: poster/preview corto.
    mode: 'poster_or_preview' as const,
    previewMaxSeconds: 5,
  },
  detail: {
    mode: 'full' as const,
  },
} as const
