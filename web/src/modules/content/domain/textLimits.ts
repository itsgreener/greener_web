/**
 * Límites de caracteres por campo de texto, decididos en sesión de
 * trabajo (proyecto: área "límites de caracteres").
 *
 * Son límites BLANDOS: no bloquean el guardado (no hay `.max()` en los
 * zod schemas por esto), solo avisan en el ABM mediante un contador. La
 * protección real del layout la da el truncado con elipsis en el
 * frontend público (`line-clamp` en los `*.module.css` de cada
 * plantilla de detalle), no esto — este módulo es la única fuente de
 * verdad para el número que se le muestra al editor, y el comentario en
 * cada CSS remite aquí para que el número de línea no se desincronice.
 *
 * - `title`, `highlight`: 2 líneas ≈ 40-55ch de medida.
 * - `body`: 8 líneas (un párrafo), 70ch de medida.
 * - `summary` (tool/insight/other — "para qué sirve/tema general", una
 *   mini introducción, no un cuerpo): 3 líneas, 70ch de medida. Más
 *   corto que `body` a propósito.
 * - `client`: una sola línea, sin `line-clamp` (usa ellipsis simple).
 * - `seoTitle`/`seoDescription`: no dependen del layout — son la
 *   aproximación estándar de cuánto trunca Google el snippet.
 */
export const TEXT_LIMITS = {
  title: 80,
  highlight: 110,
  body: 560,
  client: 60,
  summary: 200,
  seoTitle: 60,
  seoDescription: 160,
} as const

export type TextLimitField = keyof typeof TEXT_LIMITS
