import { describe, expect, it } from 'vitest'

import {
  CONSENT_MAX_AGE_DAYS,
  CONSENT_TEXT_VERSION,
  choiceFor,
  consentStatusOf,
  createConsentRecord,
  parseConsent,
  serializeConsent,
} from '@/modules/consent/domain/consent'

const NOW = new Date('2026-10-13T10:00:00Z')

describe('consentimiento — dominio', () => {
  it('serializa y vuelve a leer la decisión', () => {
    const record = createConsentRecord('accepted', NOW)

    expect(parseConsent(serializeConsent(record), NOW)).toEqual(record)
    expect(record.version).toBe(CONSENT_TEXT_VERSION)
  })

  it('la cookie no lleva nada más que decisión, versión y fecha (sin identificador)', () => {
    const raw = decodeURIComponent(
      serializeConsent(createConsentRecord('rejected', NOW)),
    )

    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['d', 't', 'v'])
  })

  it.each([
    ['vacío', ''],
    ['nulo', null],
    ['no es JSON', 'nope'],
    ['no es un objeto', encodeURIComponent('"x"')],
    [
      'decisión desconocida',
      encodeURIComponent(
        '{"d":"maybe","v":"2026-10-01","t":"2026-10-13T10:00:00Z"}',
      ),
    ],
    [
      'fecha ilegible',
      encodeURIComponent('{"d":"accepted","v":"2026-10-01","t":"ayer"}'),
    ],
  ])('un valor inválido (%s) vuelve a preguntar', (_name, raw) => {
    expect(parseConsent(raw, NOW)).toBeNull()
  })

  it('una versión distinta del texto vuelve a preguntar', () => {
    const raw = encodeURIComponent(
      JSON.stringify({ d: 'accepted', v: '2020-01-01', t: NOW.toISOString() }),
    )

    expect(parseConsent(raw, NOW)).toBeNull()
  })

  it('caduca a los 24 meses y no antes', () => {
    const record = createConsentRecord('accepted', NOW)
    const raw = serializeConsent(record)
    const dayMs = 24 * 60 * 60 * 1000

    expect(CONSENT_MAX_AGE_DAYS).toBe(730)
    expect(
      parseConsent(raw, new Date(NOW.getTime() + 729 * dayMs)),
    ).not.toBeNull()
    expect(parseConsent(raw, new Date(NOW.getTime() + 731 * dayMs))).toBeNull()
  })

  it('una fecha claramente futura es sospechosa y vuelve a preguntar', () => {
    const raw = serializeConsent(createConsentRecord('accepted', NOW))

    expect(parseConsent(raw, new Date(NOW.getTime() - 3 * 86400000))).toBeNull()
  })

  it('sin registro el estado es undecided', () => {
    expect(consentStatusOf(null)).toBe('undecided')
    expect(consentStatusOf(createConsentRecord('rejected', NOW))).toBe(
      'rejected',
    )
  })

  it('la X cuenta como «close», distinta de «reject», solo para el contador', () => {
    expect(choiceFor('accepted', false)).toBe('accept')
    expect(choiceFor('rejected', false)).toBe('reject')
    expect(choiceFor('rejected', true)).toBe('close')
  })
})
