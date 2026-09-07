import { describe, it, expect } from 'vitest'

import { localDateTimeToIsoUtc } from '@/app/admin/contents/[id]/edit/datetimeLocal'

describe('localDateTimeToIsoUtc', () => {
  it('convierte un datetime-local a una cadena ISO con Z (instante absoluto, sin ambigüedad)', () => {
    const result = localDateTimeToIsoUtc('2026-09-07T13:39')

    expect(result).not.toBeNull()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('el resultado representa el mismo instante que new Date() interpretaría en este proceso — la conversión ocurre en el navegador del admin, no aquí, así que el test solo comprueba que no se pierde ni se inventa información', () => {
    const value = '2026-09-07T13:39'
    const expected = new Date(value).toISOString()

    expect(localDateTimeToIsoUtc(value)).toBe(expected)
  })

  it('devuelve null con una cadena vacía, sin lanzar', () => {
    expect(localDateTimeToIsoUtc('')).toBeNull()
  })

  it('devuelve null con una cadena que no es una fecha válida, sin lanzar', () => {
    expect(localDateTimeToIsoUtc('no-es-una-fecha')).toBeNull()
  })
})
