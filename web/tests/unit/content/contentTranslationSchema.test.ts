import { describe, it, expect } from 'vitest'
import { contentTranslationSchema } from '@/modules/content/domain/contentTranslationSchema'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

describe('contentTranslationSchema', () => {
  const base = {
    contentId: CONTENT_ID,
    locale: 'es' as const,
    title: 'Título',
    seoTitle: null,
    seoDescription: null,
    summary: null,
    highlight: null,
    body: null,
  }

  it('acepta una traducción mínima con solo título', () => {
    expect(contentTranslationSchema.safeParse(base).success).toBe(true)
  })

  it('rechaza un título vacío — la función SQL upsert_content_translation también lo exige', () => {
    expect(
      contentTranslationSchema.safeParse({ ...base, title: '' }).success,
    ).toBe(false)
  })

  it('rechaza un título de solo espacios', () => {
    expect(
      contentTranslationSchema.safeParse({ ...base, title: '   ' }).success,
    ).toBe(false)
  })

  it('acepta seoTitle/seoDescription/summary explícitos', () => {
    const result = contentTranslationSchema.safeParse({
      ...base,
      seoTitle: 'Título SEO',
      seoDescription: 'Descripción SEO',
      summary: 'Resumen',
    })

    expect(result.success).toBe(true)
  })

  it('acepta highlight/body explícitos — campos propios del formato tipo B (especificacion-final-formato-detalle.md §3)', () => {
    const result = contentTranslationSchema.safeParse({
      ...base,
      highlight: 'Subtítulo destacado',
      body: 'Cuerpo del caso o episodio',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.highlight).toBe('Subtítulo destacado')
      expect(result.data.body).toBe('Cuerpo del caso o episodio')
    }
  })

  it('rechaza un locale no soportado', () => {
    expect(
      contentTranslationSchema.safeParse({ ...base, locale: 'pt' }).success,
    ).toBe(false)
  })
})
