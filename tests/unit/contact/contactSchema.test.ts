import { describe, it, expect } from 'vitest'
import { contactFormSchema } from '@/modules/contact/domain/contactSchema'
import { CONTACT_LIMITS } from '@/modules/contact/domain/contactLimits'

describe('contactFormSchema', () => {
  const base = {
    name: 'Marta García',
    phone: '+34 600 000 000',
    email: 'marta@example.com',
    message: 'Hola, quería preguntaros por vuestros servicios.',
  }

  it('acepta un envío válido', () => {
    expect(contactFormSchema.safeParse(base).success).toBe(true)
  })

  it.each(['name', 'phone', 'email', 'message'] as const)(
    'rechaza %s vacío',
    (field) => {
      const result = contactFormSchema.safeParse({ ...base, [field]: '' })
      expect(result.success).toBe(false)
    },
  )

  it('rechaza un email inválido', () => {
    const result = contactFormSchema.safeParse({
      ...base,
      email: 'no-es-un-email',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza un mensaje de más de 5000 caracteres', () => {
    const result = contactFormSchema.safeParse({
      ...base,
      message: 'a'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it.each(['name', 'phone', 'email', 'message'] as const)(
    'acepta %s con su longitud máxima exacta y rechaza una más, con un aviso de longitud',
    (field) => {
      const filler = (n: number) =>
        field === 'email' ? `${'a'.repeat(n - 12)}@example.com` : 'a'.repeat(n)
      const max = CONTACT_LIMITS[field]

      expect(
        contactFormSchema.safeParse({ ...base, [field]: filler(max) }).success,
      ).toBe(true)

      const tooLong = contactFormSchema.safeParse({
        ...base,
        [field]: filler(max + 1),
      })
      expect(tooLong.success).toBe(false)
      if (!tooLong.success) {
        expect(tooLong.error.issues[0].message).toContain(
          `can't be longer than ${max} characters`,
        )
      }
    },
  )

  it('el HTML y el esquema comparten las mismas longitudes máximas', () => {
    expect(CONTACT_LIMITS).toEqual({
      name: 200,
      phone: 40,
      email: 254,
      message: 5000,
    })
  })

  it('no exige ninguna casilla de privacidad: la casilla del formulario es solo informativa', () => {
    expect(contactFormSchema.safeParse(base).success).toBe(true)
    expect(contactFormSchema.shape).not.toHaveProperty('privacyConsent')
  })

  it('recorta espacios de los campos de texto', () => {
    const result = contactFormSchema.safeParse({
      ...base,
      name: '  Marta García  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Marta García')
    }
  })
})
