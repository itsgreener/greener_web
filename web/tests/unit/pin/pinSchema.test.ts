import { describe, it, expect } from 'vitest'

import {
  pinRatioSchema,
  createPinSchema,
  updatePinSchema,
  deletePinSchema,
} from '@/modules/pin/domain/pinSchema'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const PIN_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'

describe('pinRatioSchema', () => {
  it('acepta los siete ratios cerrados (especificacion-final-formato-detalle.md §4)', () => {
    for (const ratio of ['1:1', '4:3', '4:5', '3:4', '2:3', '9:16', '16:9']) {
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
    ratio: '1:1' as const,
    label: 'Pin de ejemplo',
    language: 'es' as const,
    autoplayMode: null,
    alt: 'Texto alternativo',
  }

  it('acepta un pin mínimo válido', () => {
    expect(createPinSchema.safeParse(base).success).toBe(true)
  })

  it('convierte un label vacío a null en vez de rechazarlo — la obligatoriedad depende del tipo de contenido y la aplica la función SQL, no este schema (§3, §6)', () => {
    const result = createPinSchema.safeParse({ ...base, label: '  ' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBeNull()
    }
  })

  it('acepta label ausente (case/episode, donde no se muestra)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { label: _label, ...withoutLabel } = base
    expect(createPinSchema.safeParse(withoutLabel).success).toBe(true)
  })

  it('rechaza alt vacío — "alt not null" en el esquema (§7.4 de la arquitectura)', () => {
    expect(createPinSchema.safeParse({ ...base, alt: '' }).success).toBe(false)
  })

  it('ya no recibe queueOrder: el orden en cola se asigna solo', () => {
    const parsed = createPinSchema.safeParse({ ...base, queueOrder: 5 })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data).not.toHaveProperty('queueOrder')
  })

  it('ya no acepta ni exige showAsCarousel ni speedMs: un pin no tiene carrusel', () => {
    const parsed = createPinSchema.safeParse({
      ...base,
      showAsCarousel: true,
      speedMs: 3000,
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty('showAsCarousel')
      expect(parsed.data).not.toHaveProperty('speedMs')
    }
  })

  it('acepta autoplayMode viewport/hover', () => {
    expect(
      createPinSchema.safeParse({
        ...base,
        autoplayMode: 'viewport',
      }).success,
    ).toBe(true)
  })

  it('rechaza un contentId inválido', () => {
    expect(
      createPinSchema.safeParse({ ...base, contentId: 'no-es-uuid' }).success,
    ).toBe(false)
  })

  it("ya no acepta 'type' como campo — pin_type desaparece (§3, §6)", () => {
    // zod ignora claves no declaradas: el resultado es válido, pero
    // 'type' nunca llega a create_pin (que ya no lo acepta).
    const result = createPinSchema.safeParse({ ...base, type: 'fixed' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('type')
    }
  })
})

describe('updatePinSchema', () => {
  it('no lleva contentId — no se puede cambiar tras crear el pin', () => {
    const result = updatePinSchema.safeParse({
      id: PIN_ID,
      ratio: '4:5',
      label: 'Actualizado',
      language: 'es',
      autoplayMode: null,
      alt: 'Alt actualizado',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('contentId')
    }
  })

  it('rechaza un id que no sea uuid', () => {
    expect(
      updatePinSchema.safeParse({
        id: 'no-es-uuid',
        ratio: '1:1',
        label: 'x',
        language: 'es',
        autoplayMode: null,
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
