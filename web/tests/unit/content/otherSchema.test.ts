import { describe, expect, it, vi } from 'vitest'

import { createContentSchema } from '@/modules/content/domain/contentSchema'
import {
  createOtherSchema,
  OTHER_DEFAULT_FREQUENCY,
  OTHER_MIN_FREQUENCY,
  otherFrequencySchema,
  otherKindLabel,
  otherKindSchema,
  updateOtherFrequencySchema,
} from '@/modules/content/domain/otherSchema'
import { makeCreateOther } from '@/modules/content/application/createOther'
import { makeUpdateOtherFrequency } from '@/modules/content/application/updateOtherFrequency'

/**
 * ABM de los contenidos `other` (plan de other, §7). La frecuencia mínima y
 * el subtipo se validan aquí y, a la vez, en la base de datos.
 */

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

const base = {
  slug: 'suscribete',
  defaultLocale: 'es' as const,
  title: 'Suscríbete',
  kind: 'newsletter' as const,
  frequency: 100,
}

describe('otherKindSchema', () => {
  it('acepta newsletter y page, y nada más', () => {
    expect(otherKindSchema.safeParse('newsletter').success).toBe(true)
    expect(otherKindSchema.safeParse('page').success).toBe(true)
    expect(otherKindSchema.safeParse('survey').success).toBe(false)
    expect(otherKindSchema.safeParse(null).success).toBe(false)
  })

  it('etiquetas para el panel', () => {
    expect(otherKindLabel('newsletter')).toBe('Newsletter')
    expect(otherKindLabel('page')).toBe('Página satélite')
  })
})

describe('otherFrequencySchema', () => {
  it('el mínimo es 25 y el valor por defecto 100', () => {
    expect(OTHER_MIN_FREQUENCY).toBe(25)
    expect(OTHER_DEFAULT_FREQUENCY).toBe(100)
  })

  it('acepta 25 o más', () => {
    expect(otherFrequencySchema.safeParse(25).success).toBe(true)
    expect(otherFrequencySchema.safeParse(100).success).toBe(true)
  })

  it('rechaza menos de 25 con un mensaje que dice el mínimo', () => {
    const result = otherFrequencySchema.safeParse(24)

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('25')
  })

  it('rechaza 0, negativos, decimales y NaN (no hay «0 = desactivado»)', () => {
    for (const value of [0, -5, 30.5, Number.NaN]) {
      expect(otherFrequencySchema.safeParse(value).success).toBe(false)
    }
  })
})

describe('createOtherSchema', () => {
  it('acepta un other completo', () => {
    expect(createOtherSchema.safeParse(base).success).toBe(true)
  })

  it('exige subtipo y frecuencia', () => {
    expect(
      createOtherSchema.safeParse({ ...base, kind: undefined }).success,
    ).toBe(false)
    expect(
      createOtherSchema.safeParse({ ...base, frequency: undefined }).success,
    ).toBe(false)
  })

  it('reutiliza las reglas de slug y título del alta de contenidos', () => {
    expect(
      createOtherSchema.safeParse({ ...base, slug: 'Con Espacios' }).success,
    ).toBe(false)
    expect(createOtherSchema.safeParse({ ...base, title: '  ' }).success).toBe(
      false,
    )
  })

  it('no acepta una frecuencia por debajo del mínimo', () => {
    expect(
      createOtherSchema.safeParse({ ...base, frequency: 10 }).success,
    ).toBe(false)
  })
})

describe('createContentSchema ya no crea other', () => {
  it('rechaza type other: se crea con createOtherSchema', () => {
    expect(
      createContentSchema.safeParse({
        type: 'other',
        slug: 'x',
        defaultLocale: 'es',
        title: 'X',
      }).success,
    ).toBe(false)
  })
})

describe('updateOtherFrequencySchema', () => {
  it('pide un id válido y una frecuencia válida', () => {
    expect(
      updateOtherFrequencySchema.safeParse({
        contentId: CONTENT_ID,
        frequency: 50,
      }).success,
    ).toBe(true)
    expect(
      updateOtherFrequencySchema.safeParse({
        contentId: 'no-es-un-id',
        frequency: 50,
      }).success,
    ).toBe(false)
    expect(
      updateOtherFrequencySchema.safeParse({
        contentId: CONTENT_ID,
        frequency: 5,
      }).success,
    ).toBe(false)
  })
})

function fakeOthers() {
  return {
    getByContentId: vi.fn(),
    listPublishedFrequencies: vi.fn(async () => [] as number[]),
    createDraft: vi.fn(async () => CONTENT_ID),
    updateFrequency: vi.fn(async () => CONTENT_ID),
  }
}

describe('casos de uso de other', () => {
  it('createOther valida y delega en el repositorio', async () => {
    const others = fakeOthers()

    await expect(makeCreateOther({ others })(base)).resolves.toBe(CONTENT_ID)
    expect(others.createDraft).toHaveBeenCalledWith(base)
  })

  it('createOther no toca el repositorio con datos inválidos', async () => {
    const others = fakeOthers()

    await expect(
      makeCreateOther({ others })({ ...base, frequency: 3 }),
    ).rejects.toThrow()
    expect(others.createDraft).not.toHaveBeenCalled()
  })

  it('updateOtherFrequency valida y delega en el repositorio', async () => {
    const others = fakeOthers()

    await makeUpdateOtherFrequency({ others })({
      contentId: CONTENT_ID,
      frequency: 40,
    })

    expect(others.updateFrequency).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      frequency: 40,
    })
  })

  it('updateOtherFrequency no toca el repositorio con una frecuencia inválida', async () => {
    const others = fakeOthers()

    await expect(
      makeUpdateOtherFrequency({ others })({
        contentId: CONTENT_ID,
        frequency: 24,
      }),
    ).rejects.toThrow()
    expect(others.updateFrequency).not.toHaveBeenCalled()
  })
})
