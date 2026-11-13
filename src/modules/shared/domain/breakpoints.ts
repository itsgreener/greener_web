/**
 * Breakpoints: la única fuente de los anchos de los `@media (max-width)`,
 * en la web pública y en el ABM (que comparte los mismos puntos de corte).
 *
 * `tests/unit/shared/breakpoints.test.ts` recorre los `@media (max-width)`
 * de los CSS y falla si aparece un ancho que no está aquí, de modo que JS
 * y CSS no se pueden desincronizar sin que salte.
 */
export const BREAKPOINT_PX = {
  /** < 640: móvil (2 columnas, 1 hueco de vídeo). */
  mobile: 640,
  /** < 900: 3 columnas. */
  tablet: 900,
  /** < 1200: 4 columnas; a partir de aquí, escritorio (6). */
  desktop: 1200,
  /**
   * >= 1920 (1080p): único `@media (min-width)` de la web. Aquí el texto de
   * las tarjetas del masonry pasa de 0.8rem a 0.9rem (--fs-card en
   * globals.css) y `labelHeight.ts` reserva el alto de rótulo
   * correspondiente. Por debajo no cambia nada.
   */
  fullHd: 1920,
} as const
