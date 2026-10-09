import { describe, it, expect } from 'vitest'
import { caseDetailSchema } from '@/modules/content/domain/caseDetailSchema'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

describe('caseDetailSchema', () => {
  const base = {
    contentId: CONTENT_ID,
    force: 1,
    client: null,
  }

  it('acepta force en el rango 1-5 (especificacion-final-formato-detalle.md §3, igual que upsert_case_detail)', () => {
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

  it('acepta client como texto libre no traducible', () => {
    const result = caseDetailSchema.safeParse({
      ...base,
      client: 'Agróptimum',
    })

    expect(result.success).toBe(true)
  })

  it('acepta client null', () => {
    expect(caseDetailSchema.safeParse({ ...base, client: null }).success).toBe(
      true,
    )
  })

  it('ya no acepta templateVariant/sector/services/year/credits/links — eliminados del formato (§3, §6)', () => {
    const result = caseDetailSchema.safeParse({
      ...base,
      templateVariant: 'A',
      sector: 'Agro',
      services: 'Branding',
      year: 2024,
      credits: [],
      links: [],
    })

    // zod ignora las claves no declaradas en el schema por defecto: el
    // resultado sigue siendo válido, pero esos campos no llegan a la
    // función SQL (upsert_case_detail ya no los acepta como parámetros).
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('templateVariant')
      expect(result.data).not.toHaveProperty('sector')
      expect(result.data).not.toHaveProperty('year')
    }
  })
})
