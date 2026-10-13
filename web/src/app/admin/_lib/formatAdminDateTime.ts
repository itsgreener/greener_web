/**
 * Fecha y hora del ABM, SIEMPRE en hora de Madrid. Sin `timeZone`, un Server
 * Component escribiría la hora del proceso Node (UTC en el hosting) y un
 * Client Component la del navegador, y el HTML del servidor y el de la
 * hidratación podrían no coincidir. Fijar la zona hace que ambos lados
 * escriban lo mismo.
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
