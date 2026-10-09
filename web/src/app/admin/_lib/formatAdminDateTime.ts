/**
 * Fecha y hora del ABM, SIEMPRE en hora de Madrid (auditoría 8 oct, P0-9).
 *
 * Antes había cuatro copias de `toLocaleString('es-ES')` sin `timeZone`: en
 * los Server Components salía la hora del proceso Node (UTC en el hosting,
 * 2 h menos en verano) y en los Client Components la del navegador, con el
 * riesgo añadido de que el HTML del servidor y el de la hidratación no
 * coincidieran. Fijar la zona hace que ambos lados escriban lo mismo.
 */
export const ADMIN_TIME_ZONE = 'Europe/Madrid'

const formatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: ADMIN_TIME_ZONE,
})

export function formatAdminDateTime(
  value: string | null | undefined,
  empty = '—',
): string {
  if (!value) return empty

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? empty : formatter.format(date)
}
