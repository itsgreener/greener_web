import { describe, it, expect } from 'vitest'
import { contactFormSchema } from '@/modules/contact/domain/contactSchema'

describe('contactFormSchema', () => {
  const base = {
    name: 'Marta García',
    phone: '+34 600 000 000',
    email: 'marta@example.com',
    message: 'Hola, quería preguntaros por vuestros servicios.',
    privacyConsent: true,
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

  it('rechaza sin aceptar la política de privacidad (§14.1: obligatorio)', () => {
    expect(
      contactFormSchema.safeParse({ ...base, privacyConsent: false }).success,
    ).toBe(false)
    expect(
      contactFormSchema.safeParse({ ...base, privacyConsent: undefined })
        .success,
    ).toBe(false)
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
