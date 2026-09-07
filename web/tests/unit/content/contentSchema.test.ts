import { describe, it, expect } from 'vitest'
import {
  contentTypeSchema,
  localeSchema,
  createContentSchema,
  updateContentSchema,
  deleteContentSchema,
} from '@/modules/content/domain/contentSchema'

describe('contentTypeSchema', () => {
  it('acepta los cinco tipos del supertipo content (§7.1)', () => {
    for (const type of ['case', 'insight', 'tool', 'episode', 'page']) {
      expect(contentTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  it("rechaza 'shop' — excluido de V1 (ADR-10)", () => {
    expect(contentTypeSchema.safeParse('shop').success).toBe(false)
  })
})

describe('localeSchema', () => {
  it('acepta es/en/ca', () => {
    for (const locale of ['es', 'en', 'ca']) {
      expect(localeSchema.safeParse(locale).success).toBe(true)
    }
  })

  it('rechaza cualquier otro idioma', () => {
    expect(localeSchema.safeParse('fr').success).toBe(false)
  })
})

describe('createContentSchema', () => {
  const base = {
    type: 'case' as const,
    slug: 'mi-primer-caso',
    defaultLocale: 'es' as const,
    title: 'Mi primer caso',
  }

  it('acepta un slug en minúsculas con guiones', () => {
    expect(createContentSchema.safeParse(base).success).toBe(true)
  })

  it('acepta un slug de un solo segmento sin guiones', () => {
    const result = createContentSchema.safeParse({ ...base, slug: 'caso' })
    expect(result.success).toBe(true)
  })

  it.each([
    'Mi-Caso', // mayúsculas
    'mi_caso', // guion bajo
    'mi caso', // espacio
    '-mi-caso', // guion inicial
    'mi-caso-', // guion final
    'mi--caso', // doble guion
    '',
  ])('rechaza el slug inválido %j', (slug) => {
    expect(createContentSchema.safeParse({ ...base, slug }).success).toBe(false)
  })

  it('recorta espacios en slug y título antes de validar', () => {
    const result = createContentSchema.safeParse({
      ...base,
      slug: '  mi-primer-caso  ',
      title: '  Mi primer caso  ',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.slug).toBe('mi-primer-caso')
      expect(result.data.title).toBe('Mi primer caso')
    }
  })

  it('rechaza un título vacío o solo espacios', () => {
    expect(
      createContentSchema.safeParse({ ...base, title: '   ' }).success,
    ).toBe(false)
  })

  it('rechaza un tipo de contenido no soportado', () => {
    expect(
      createContentSchema.safeParse({ ...base, type: 'shop' }).success,
    ).toBe(false)
  })
})

describe('updateContentSchema', () => {
  it("ya NO acepta 'type' — el tipo queda bloqueado tras crear el contenido (migración 20260827091314)", () => {
    const withType = {
      id: '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f',
      type: 'case',
      slug: 'mi-caso',
      defaultLocale: 'es',
    }

    const result = updateContentSchema.safeParse(withType)

    expect(result.success).toBe(true)
    if (result.success) {
      // El campo 'type', si se envía, se ignora silenciosamente: no forma
      // parte del schema. Confirma que no hay forma de colarlo desde el
      // formulario del ABM.
      expect(result.data).not.toHaveProperty('type')
    }
  })

  it('rechaza un id que no sea un uuid válido', () => {
    const result = updateContentSchema.safeParse({
      id: 'no-es-un-uuid',
      slug: 'mi-caso',
      defaultLocale: 'es',
    })

    expect(result.success).toBe(false)
  })

  it('rechaza el mismo slug inválido que createContentSchema', () => {
    const result = updateContentSchema.safeParse({
      id: '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f',
      slug: 'Slug Con Espacios',
      defaultLocale: 'es',
    })

    expect(result.success).toBe(false)
  })
})

describe('deleteContentSchema', () => {
  it('acepta un uuid válido', () => {
    const result = deleteContentSchema.safeParse({
      id: '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza un id vacío', () => {
    expect(deleteContentSchema.safeParse({ id: '' }).success).toBe(false)
  })
})
