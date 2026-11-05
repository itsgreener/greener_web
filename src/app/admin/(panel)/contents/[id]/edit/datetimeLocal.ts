/**
 * Convierte el valor de un <input type="datetime-local"> a una cadena ISO
 * en UTC, usando la zona horaria del propio navegador donde se ejecuta —
 * que es la única que sabe qué quiso decir el admin al elegir la fecha.
 *
 * Por qué hace falta: datetime-local no lleva zona horaria ("2026-09-07T13:39").
 * Si esa cadena viaja tal cual hasta el servidor y se parsea allí con
 * z.coerce.date(), se interpreta con la zona horaria del PROCESO NODE del
 * servidor, no la del admin — en un hosting en UTC, "13:39" en Madrid
 * (UTC+1/+2) se leería como "13:39 UTC", con 1-2 horas de error. Convertir
 * aquí, en el navegador, antes de enviarlo, elimina la ambigüedad: el
 * servidor siempre recibe un instante absoluto sin que le haga falta saber
 * en qué zona horaria está el admin.
 */
export function localDateTimeToIsoUtc(value: string): string | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}
