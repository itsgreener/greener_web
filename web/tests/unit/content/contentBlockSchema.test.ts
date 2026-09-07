import { describe, it, expect } from 'vitest'
import {
  contentBlockTypeSchema,
  createContentBlockSchema,
  updateContentBlockSchema,
  deleteContentBlockSchema,
  contentBlockTranslationSchema,
} from '@/modules/content/domain/contentBlockSchema'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const BLOCK_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'

describe('contentBlockTypeSchema', () => {
  it('acepta los seis tipos de bloque genérico definidos en §11.3', () => {
    for (const type of [
      'rich_text',
      'image',
      'carousel',
      'video',
      'quote',
      'links_credits',
    ]) {
      expect(contentBlockTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  it('rechaza un tipo de bloque inventado', () => {
    expect(contentBlockTypeSchema.safeParse('gallery').success).toBe(false)
  })
})

describe('createContentBlockSchema', () => {
  const base = {
    contentId: CONTENT_ID,
    type: 'rich_text' as const,
    sortOrder: 0,
    config: {},
  }

  it('acepta un bloque válido con config vacía', () => {
    expect(createContentBlockSchema.safeParse(base).success).toBe(true)
  })

  it('acepta config con claves arbitrarias (jsonb libre, arquitectura §7.2)', () => {
    const result = createContentBlockSchema.safeParse({
      ...base,
      config: { ratio: '16:9', mediaIds: ['a', 'b'] },
    })

    expect(result.success).toBe(true)
  })

  it('rechaza sortOrder negativo — igual que la función SQL create_content_block', () => {
    expect(
      createContentBlockSchema.safeParse({ ...base, sortOrder: -1 }).success,
    ).toBe(false)
  })

  it('rechaza sortOrder no entero', () => {
    expect(
      createContentBlockSchema.safeParse({ ...base, sortOrder: 1.5 }).success,
    ).toBe(false)
  })

  it('rechaza un contentId que no sea uuid', () => {
    expect(
      createContentBlockSchema.safeParse({ ...base, contentId: 'no-es-uuid' })
        .success,
    ).toBe(false)
  })
})

describe('updateContentBlockSchema', () => {
  it("no incluye 'type' — el tipo de bloque es inmutable (migración 20260827103450)", () => {
    const result = updateContentBlockSchema.safeParse({
      id: BLOCK_ID,
      sortOrder: 10,
      config: {},
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('type')
    }
  })

  it('rechaza sortOrder negativo', () => {
    const result = updateContentBlockSchema.safeParse({
      id: BLOCK_ID,
      sortOrder: -5,
      config: {},
    })

    expect(result.success).toBe(false)
  })
})

describe('deleteContentBlockSchema', () => {
  it('acepta un uuid válido', () => {
    expect(deleteContentBlockSchema.safeParse({ id: BLOCK_ID }).success).toBe(
      true,
    )
  })
})

describe('contentBlockTranslationSchema', () => {
  const base = {
    blockId: BLOCK_ID,
    locale: 'es' as const,
    bodyRichText: null,
    caption: null,
    quoteText: null,
  }

  it('acepta los tres campos de texto como null (el bloque decide cuál aplica en la función SQL)', () => {
    expect(contentBlockTranslationSchema.safeParse(base).success).toBe(true)
  })

  it("acepta texto en cualquiera de los tres campos — la validación de 'cuál es obligatorio según el tipo' vive en la función SQL, no en el schema", () => {
    const result = contentBlockTranslationSchema.safeParse({
      ...base,
      bodyRichText: 'Cuerpo del bloque',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza un locale fuera de es/en/ca', () => {
    expect(
      contentBlockTranslationSchema.safeParse({ ...base, locale: 'fr' })
        .success,
    ).toBe(false)
  })
})
