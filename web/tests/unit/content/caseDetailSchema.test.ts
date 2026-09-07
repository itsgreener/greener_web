import { describe, it, expect } from 'vitest'
import {
  caseTemplateVariantSchema,
  caseDetailSchema,
} from '@/modules/content/domain/caseDetailSchema'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

describe('caseTemplateVariantSchema', () => {
  it('acepta las tres variantes de §11.2 (A, B, C)', () => {
    for (const variant of ['A', 'B', 'C']) {
      expect(caseTemplateVariantSchema.safeParse(variant).success).toBe(true)
    }
  })

  it('rechaza una variante inventada', () => {
    expect(caseTemplateVariantSchema.safeParse('D').success).toBe(false)
  })
})

describe('caseDetailSchema', () => {
  const base = {
    contentId: CONTENT_ID,
    templateVariant: 'A' as const,
    force: 1,
    client: null,
    sector: null,
    services: null,
    year: null,
    credits: [],
    links: [],
  }

  it('acepta force en el rango 1-5 (arquitectura §7.3, igual que upsert_case_detail)', () => {
    for (const force of [1, 2, 3, 4, 5]) {
      expect(caseDetailSchema.safeParse({ ...base, force }).success).toBe(true)
    }
  })

  it.each([0, 6, -1])('rechaza force fuera de rango: %d', (force) => {
    expect(caseDetailSchema.safeParse({ ...base, force }).success).toBe(false)
  })

  it('rechaza force no entero', () => {
    expect(caseDetailSchema.safeParse({ ...base, force: 2.5 }).success).toBe(
      false,
    )
  })

  it('acepta client/sector/services como texto libre no traducible (§7.3)', () => {
    const result = caseDetailSchema.safeParse({
      ...base,
      client: 'Agróptimum',
      sector: 'Agro',
      services: 'Branding, Insights',
    })

    expect(result.success).toBe(true)
  })

  it('acepta credits y links como arrays de contenido arbitrario', () => {
    const result = caseDetailSchema.safeParse({
      ...base,
      credits: [{ role: 'Dirección creativa', name: 'Alguien' }],
      links: [{ label: 'Sitio', url: 'https://example.com' }],
    })

    expect(result.success).toBe(true)
  })

  it('rechaza credits que no sea un array', () => {
    const result = caseDetailSchema.safeParse({
      ...base,
      credits: { role: 'Dirección creativa' },
    })

    expect(result.success).toBe(false)
  })

  it('acepta year null (campo opcional)', () => {
    expect(caseDetailSchema.safeParse({ ...base, year: null }).success).toBe(
      true,
    )
  })
})
