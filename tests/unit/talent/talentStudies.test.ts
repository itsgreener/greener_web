import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { STUDIES_MIN_DATE } from '@/modules/talent/domain/talentConstants'
import {
  formatIsoDate,
  isStudiesEndDate,
  parseIsoDate,
} from '@/modules/talent/domain/talentStudies'
import { candidateFormSchema } from '@/modules/talent/domain/talentSchemas'
import { validFormInput } from '@tests/helpers/talentFakes'

const NOW = Date.parse('2026-11-11T12:00:00.000Z')

describe('parseIsoDate', () => {
  it('acepta fechas reales y rechaza las imposibles o mal formadas', () => {
    expect(parseIsoDate('2026-06-15')).toBe('2026-06-15')
    expect(parseIsoDate('2024-02-29')).toBe('2024-02-29')
    expect(parseIsoDate('2026-02-29')).toBeNull()
    expect(parseIsoDate('2026-02-31')).toBeNull()
    expect(parseIsoDate('2026-13-01')).toBeNull()
    expect(parseIsoDate('2026-6-5')).toBeNull()
    expect(parseIsoDate('15/06/2026')).toBeNull()
    expect(parseIsoDate('2026-06-15T10:00:00Z')).toBeNull()
    expect(parseIsoDate('')).toBeNull()
  })

  it('para cualquier día real el resultado es el mismo texto', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1950-01-01'), max: new Date('2100-12-31') }),
        (date) => {
          const iso = date.toISOString().slice(0, 10)

          expect(parseIsoDate(iso)).toBe(iso)
        },
      ),
    )
  })
})

describe('isStudiesEndDate', () => {
  it('desde 1950 hasta mañana en UTC (el huso adelantado no se rechaza)', () => {
    expect(isStudiesEndDate(STUDIES_MIN_DATE, NOW)).toBe(true)
    expect(isStudiesEndDate('1949-12-31', NOW)).toBe(false)
    expect(isStudiesEndDate('2026-11-11', NOW)).toBe(true)
    expect(isStudiesEndDate('2026-11-12', NOW)).toBe(true)
    expect(isStudiesEndDate('2026-11-13', NOW)).toBe(false)
  })

  it('una fecha imposible no es válida aunque esté en rango', () => {
    expect(isStudiesEndDate('2026-02-30', NOW)).toBe(false)
  })
})

describe('formatIsoDate', () => {
  it('pasa a día/mes/año sin pasar por un Date local', () => {
    expect(formatIsoDate('2026-06-05')).toBe('05/06/2026')
    expect(formatIsoDate(null)).toBeNull()
    expect(formatIsoDate('nada')).toBeNull()
  })
})

describe('candidateFormSchema: estudios finalizados', () => {
  it('ausentes: undefined (no es lo mismo que «sin responder»)', () => {
    const parsed = candidateFormSchema.parse(validFormInput())

    expect(parsed.studiesFinished).toBeUndefined()
    expect(parsed.studiesEndDate).toBeUndefined()
  })

  it('una fecha sin la pregunta tampoco se guarda', () => {
    const parsed = candidateFormSchema.parse(
      validFormInput({ studiesEndDate: '2026-06-15' }),
    )

    expect(parsed.studiesEndDate).toBeUndefined()
  })

  it('«sí» con fecha válida la conserva; «no» y null la descartan', () => {
    expect(
      candidateFormSchema.parse(
        validFormInput({ studiesFinished: true, studiesEndDate: '2026-06-15' }),
      ),
    ).toMatchObject({ studiesFinished: true, studiesEndDate: '2026-06-15' })
    expect(
      candidateFormSchema.parse(
        validFormInput({
          studiesFinished: false,
          studiesEndDate: '2026-06-15',
        }),
      ),
    ).toMatchObject({ studiesFinished: false, studiesEndDate: null })
    expect(
      candidateFormSchema.parse(
        validFormInput({ studiesFinished: null, studiesEndDate: '2026-06-15' }),
      ),
    ).toMatchObject({ studiesFinished: null, studiesEndDate: null })
  })

  it('«sí» sin fecha se acepta (la fecha es opcional)', () => {
    expect(
      candidateFormSchema.parse(validFormInput({ studiesFinished: true })),
    ).toMatchObject({ studiesFinished: true, studiesEndDate: null })
  })

  it.each(['2026-02-31', '15/06/2026', '1949-01-01', '2999-01-01', 'ayer'])(
    '«sí» con la fecha inválida %s se rechaza en studiesEndDate',
    (date) => {
      const result = candidateFormSchema.safeParse(
        validFormInput({ studiesFinished: true, studiesEndDate: date }),
      )

      expect(result.success).toBe(false)
      expect(
        !result.success && result.error.issues.map((i) => i.path[0]),
      ).toContain('studiesEndDate')
    },
  )

  it('con «no» una fecha inválida no estorba: se descarta', () => {
    expect(
      candidateFormSchema.safeParse(
        validFormInput({
          studiesFinished: false,
          studiesEndDate: '2026-02-31',
        }),
      ).success,
    ).toBe(true)
  })

  it('studiesFinished solo admite booleano o null', () => {
    expect(
      candidateFormSchema.safeParse(validFormInput({ studiesFinished: 'si' }))
        .success,
    ).toBe(false)
  })
})
