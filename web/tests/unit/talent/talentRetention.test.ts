import { describe, expect, it } from 'vitest'

import {
  isRetentionExpired,
  parseCreatedAt,
  retentionExpiry,
  UNDATED_RETENTION_END,
} from '@/modules/talent/domain/talentRetention'

describe('retentionExpiry', () => {
  it('con fecha: dos años después de created_at', () => {
    expect(retentionExpiry('2026-05-13T10:30:00').toISOString()).toBe(
      '2028-05-13T10:30:00.000Z',
    )
  })

  it('un timestamp sin zona se lee como UTC, con o sin «T»', () => {
    expect(parseCreatedAt('2026-05-13 10:30:00')?.toISOString()).toBe(
      '2026-05-13T10:30:00.000Z',
    )
    expect(parseCreatedAt('2026-05-13T10:30:00+02:00')?.toISOString()).toBe(
      '2026-05-13T08:30:00.000Z',
    )
  })

  it('un 29 de febrero no se sale del mes al sumar años', () => {
    expect(retentionExpiry('2024-02-29T00:00:00').toISOString()).toBe(
      '2026-03-01T00:00:00.000Z',
    )
  })

  it.each([null, undefined, '', '   ', 'no es una fecha'])(
    'sin fecha (%s): la fecha fija, un año después de la actualización',
    (value) => {
      expect(retentionExpiry(value)).toEqual(UNDATED_RETENTION_END)
      expect(UNDATED_RETENTION_END.toISOString()).toBe(
        '2027-10-20T00:00:00.000Z',
      )
    },
  )
})

describe('isRetentionExpired', () => {
  const now = new Date('2026-10-20T12:00:00Z')

  it('una fila de mayo de 2026 no ha caducado', () => {
    expect(isRetentionExpired('2026-05-13T10:30:00', now)).toBe(false)
  })

  it('una fila de hace más de dos años sí', () => {
    expect(isRetentionExpired('2024-10-19T10:00:00', now)).toBe(true)
  })

  it('el día exacto del segundo aniversario ya cuenta como caducada', () => {
    expect(isRetentionExpired('2024-10-20T12:00:00', now)).toBe(true)
  })

  it('las filas sin fecha no caducan hasta el 20 de octubre de 2027', () => {
    expect(isRetentionExpired(null, now)).toBe(false)
    expect(isRetentionExpired(null, new Date('2027-10-19T23:59:59Z'))).toBe(
      false,
    )
    expect(isRetentionExpired(null, new Date('2027-10-20T00:00:00Z'))).toBe(
      true,
    )
  })
})
