import { describe, expect, it } from 'vitest'

import { newsletterSchema } from '@/modules/newsletter/domain/newsletterSchema'

describe('newsletterSchema', () => {
  it('acepta un email válido y lo recorta', () => {
    const parsed = newsletterSchema.parse({ email: '  marta@example.com  ' })

    expect(parsed.email).toBe('marta@example.com')
  })

  it('rechaza vacío, solo espacios y formato inválido', () => {
    for (const email of ['', '   ', 'sin-arroba', 'a@b', '@example.com']) {
      expect(newsletterSchema.safeParse({ email }).success).toBe(false)
    }
  })

  it('rechaza lo que no es texto (FormData.get puede devolver null)', () => {
    expect(newsletterSchema.safeParse({ email: null }).success).toBe(false)
    expect(newsletterSchema.safeParse({}).success).toBe(false)
  })

  it('rechaza más de 254 caracteres (límite de un email)', () => {
    const long = `${'a'.repeat(250)}@example.com`

    expect(newsletterSchema.safeParse({ email: long }).success).toBe(false)
  })
})
