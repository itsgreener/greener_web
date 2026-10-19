import { describe, expect, it } from 'vitest'

import { PROFILE_VALUES } from '@/modules/talent/domain/talentConstants'
import {
  candidateFormSchema,
  isWellFormedToken,
  signupSchema,
} from '@/modules/talent/domain/talentSchemas'
import { validFormInput } from '@tests/helpers/talentFakes'

describe('signupSchema', () => {
  it('normaliza: sin espacios y en minúsculas', () => {
    expect(signupSchema.parse({ email: ' Ada@Example.com ' }).email).toBe(
      'ada@example.com',
    )
  })

  it.each([
    '',
    'no-es-un-email',
    'a@b',
    'a b@c.com',
    'x'.repeat(250) + '@a.com',
  ])('rechaza %j', (email) => {
    expect(signupSchema.safeParse({ email }).success).toBe(false)
  })

  it('rechaza si falta o no es texto', () => {
    expect(signupSchema.safeParse({}).success).toBe(false)
    expect(signupSchema.safeParse({ email: 3 }).success).toBe(false)
  })
})

describe('candidateFormSchema', () => {
  it('acepta un formulario completo', () => {
    expect(candidateFormSchema.safeParse(validFormInput()).success).toBe(true)
  })

  it('el nombre es obligatorio', () => {
    const result = candidateFormSchema.safeParse(
      validFormInput({ name: '   ' }),
    )

    expect(result.success).toBe(false)
  })

  it('profile: al menos uno, solo valores conocidos y sin repetir', () => {
    expect(
      candidateFormSchema.safeParse(validFormInput({ profile: [] })).success,
    ).toBe(false)
    expect(
      candidateFormSchema.safeParse(validFormInput({ profile: ['astronauta'] }))
        .success,
    ).toBe(false)
    expect(
      candidateFormSchema.parse(validFormInput({ profile: ['copy', 'copy'] }))
        .profile,
    ).toEqual(['copy'])
  })

  it.each(PROFILE_VALUES)('acepta el perfil %s', (profile) => {
    expect(
      candidateFormSchema.safeParse(validFormInput({ profile: [profile] }))
        .success,
    ).toBe(true)
  })

  it('languages: solo los idiomas del contrato, con su nombre literal', () => {
    expect(
      candidateFormSchema.safeParse(validFormInput({ languages: { en: 'B2' } }))
        .success,
    ).toBe(false)
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ languages: { 한국어: 'A1', Galego: 'C2' } }),
      ).success,
    ).toBe(true)
  })

  it('socials: solo las redes del contrato y enlaces http(s)', () => {
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ socials: { Facebook: 'https://x.com' } }),
      ).success,
    ).toBe(false)
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ socials: { LinkedIn: 'javascript:alert(1)' } }),
      ).success,
    ).toBe(false)
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ socials: { TikTok: 'ftp://x.com' } }),
      ).success,
    ).toBe(false)
  })

  it('proyectos: enlace http(s) obligatorio, como mucho 20', () => {
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ projects: [{ link: 'no es un enlace' }] }),
      ).success,
    ).toBe(false)
    expect(
      candidateFormSchema.safeParse(
        validFormInput({
          projects: Array.from({ length: 21 }, () => ({
            link: 'https://a.example',
          })),
        }),
      ).success,
    ).toBe(false)
  })

  it('tarifas: no negativas; null o ausente es "sin tarifa"', () => {
    expect(
      candidateFormSchema.safeParse(validFormInput({ rateDay: -1 })).success,
    ).toBe(false)
    expect(
      candidateFormSchema.parse(validFormInput({ rateDay: undefined })).rateDay,
    ).toBeNull()
  })

  it('descarta campos desconocidos (no se cuela ningún status)', () => {
    const parsed = candidateFormSchema.parse(
      validFormInput({ status: 'closed', access_token: 'x', blocked: true }),
    )

    expect(parsed).not.toHaveProperty('status')
    expect(parsed).not.toHaveProperty('access_token')
    expect(parsed).not.toHaveProperty('blocked')
  })
})

describe('isWellFormedToken', () => {
  it.each([
    '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    'abcdefghijklmnop',
    'A_b-C_d-E_f-G_h-1234',
  ])('acepta %s', (token) => expect(isWellFormedToken(token)).toBe(true))

  it.each([
    '',
    'corto',
    'x'.repeat(65),
    '../../etc/passwd-aaaa',
    'a b c d e f g h i j',
    undefined,
    3,
  ])('rechaza %j', (token) => expect(isWellFormedToken(token)).toBe(false))
})
