import { STUDIES_MIN_DATE } from './talentConstants'

/**
 * Fecha de fin de estudios (`candidates.studies_end_date`, tipo `date`).
 * Viaja y se guarda como `AAAA-MM-DD`, sin hora ni huso: no se convierte a
 * `Date` local en ningún punto para que un huso no mueva el día.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 24 * 60 * 60 * 1000

/** `AAAA-MM-DD` de una fecha real (rechaza `2026-02-31`), o `null`. */
export function parseIsoDate(value: string): string | null {
  const match = ISO_DATE.exec(value)

  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const roundTrip = date.toISOString().slice(0, 10)

  return roundTrip === value ? value : null
}

/**
 * Una fecha de fin de estudios válida: real, desde `STUDIES_MIN_DATE` y como
 * mucho mañana en UTC. Compara las cadenas `AAAA-MM-DD`, que ordenan igual que
 * las fechas.
 */
export function isStudiesEndDate(value: string, now: number = Date.now()) {
  if (!parseIsoDate(value)) return false

  const tomorrow = new Date(now + DAY_MS).toISOString().slice(0, 10)

  return value >= STUDIES_MIN_DATE && value <= tomorrow
}

/** `15/06/2026` para la ficha del ABM, o `null` si no es una fecha válida. */
export function formatIsoDate(value: string | null): string | null {
  if (!value || !parseIsoDate(value)) return null

  const [year, month, day] = value.split('-')

  return `${day}/${month}/${year}`
}
