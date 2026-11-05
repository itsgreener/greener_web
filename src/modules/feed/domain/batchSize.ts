/**
 * Tamaño de los lotes del feed (pines por respuesta de la API).
 *
 * La ronda se precalcula entera y se sirve por tramos. El tamaño por defecto
 * es `feed_config.batch_size` (40); el cliente puede pedir menos
 * (`?size=`), y en teléfono pide 20. Nunca se sirve más que el configurado.
 */

/** Pines por lote que pide el cliente en pantallas de móvil. */
export const PHONE_BATCH_SIZE = 20

/**
 * Tamaño efectivo de un lote: el pedido por el cliente (entero ≥ 1) acotado
 * por el configurado; sin petición válida, el configurado.
 */
export function resolveBatchSize(
  requested: number | null | undefined,
  configured: number,
): number {
  const max = Number.isInteger(configured) && configured >= 1 ? configured : 1

  if (
    typeof requested !== 'number' ||
    !Number.isInteger(requested) ||
    requested < 1
  ) {
    return max
  }

  return Math.min(requested, max)
}
