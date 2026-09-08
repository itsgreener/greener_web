import { describe, it, expect } from 'vitest'

import {
  pinTypeSchema,
  pinRatioSchema,
  createPinSchema,
  updatePinSchema,
  deletePinSchema,
} from '@/modules/pin/domain/pinSchema'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const PIN_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'

describe('pinTypeSchema / pinRatioSchema', () => {
  it('acepta los tres tipos de pin (§9.1)', () => {
    for (const type of ['fixed', 'animated', 'carousel']) {
      expect(pinTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  it('acepta los seis ratios cerrados (§9.1)', () => {
    for (const ratio of ['1:1', '4:5', '3:4', '2:3', '9:16', '16:9']) {
      expect(pinRatioSchema.safeParse(ratio).success).toBe(true)
    }
  })

  it('rechaza un ratio fuera del catálogo cerrado', () => {
    expect(pinRatioSchema.safeParse('21:9').success).toBe(false)
  })
})

describe('createPinSchema', () => {
  const base = {
    contentId: CONTENT_ID,
    type: 'fixed' as const,
    ratio: '1:1' as const,
    label: 'Pin de ejemplo',
    cta: null,
    language: 'es' as const,
    autoplayMode: null,
    speedMs: null,
    queueOrder: 0,
    alt: 'Texto alternativo',
  }

  it('acepta un pin fijo mínimo válido', () => {
    expect(createPinSchema.safeParse(base).success).toBe(true)
  })

  it('rechaza label vacío', () => {
    expect(createPinSchema.safeParse({ ...base, label: '  ' }).success).toBe(
      false,
    )
  })

  it('rechaza alt vacío — "alt not null" en el esquema (§7.4)', () => {
    expect(createPinSchema.safeParse({ ...base, alt: '' }).success).toBe(false)
  })

  it('rechaza queueOrder negativo', () => {
    expect(createPinSchema.safeParse({ ...base, queueOrder: -1 }).success).toBe(
      false,
    )
  })

  it('acepta cta vacío y lo convierte a null', () => {
    const result = createPinSchema.safeParse({ ...base, cta: '' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cta).toBeNull()
    }
  })

  it('acepta autoplayMode viewport/hover para carrusel', () => {
    expect(
      createPinSchema.safeParse({
        ...base,
        type: 'carousel',
        autoplayMode: 'viewport',
        speedMs: 3000,
      }).success,
    ).toBe(true)
  })

  it('rechaza un contentId inválido', () => {
    expect(
      createPinSchema.safeParse({ ...base, contentId: 'no-es-uuid' }).success,
    ).toBe(false)
  })

  it('rechaza un tipo de pin inventado', () => {
    expect(createPinSchema.safeParse({ ...base, type: 'gif' }).success).toBe(
      false,
    )
  })
})

describe('updatePinSchema', () => {
  it('no lleva contentId ni type — ninguno de los dos se puede cambiar tras crear el pin', () => {
    const result = updatePinSchema.safeParse({
      id: PIN_ID,
      ratio: '4:5',
      label: 'Actualizado',
      cta: null,
      language: 'es',
      autoplayMode: null,
      speedMs: null,
      queueOrder: 2,
      alt: 'Alt actualizado',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('contentId')
      expect(result.data).not.toHaveProperty('type')
    }
  })

  it('rechaza un id que no sea uuid', () => {
    expect(
      updatePinSchema.safeParse({
        id: 'no-es-uuid',
        ratio: '1:1',
        label: 'x',
        cta: null,
        language: 'es',
        autoplayMode: null,
        speedMs: null,
        queueOrder: 0,
        alt: 'x',
      }).success,
    ).toBe(false)
  })
})

describe('deletePinSchema', () => {
  it('acepta un uuid válido', () => {
    expect(deletePinSchema.safeParse({ id: PIN_ID }).success).toBe(true)
  })

  it('rechaza un id vacío', () => {
    expect(deletePinSchema.safeParse({ id: '' }).success).toBe(false)
  })
})
