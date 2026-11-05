/** Parámetro de URL de la vista previa firmada (`?preview=<token>`). */
export const PREVIEW_PARAM = 'preview'

/**
 * ¿La página abierta es una vista previa firmada? Una vista previa no debe
 * contaminar las métricas públicas, así que quien registra eventos lo
 * consulta antes de enviarlos. Solo del lado del cliente: en el servidor
 * (sin `window`) devuelve false.
 */
export function isPreviewRequest(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has(PREVIEW_PARAM)
}
