import { describe, expect, it } from 'vitest'

import {
  EXPERIENCE_VALUES,
  LANGUAGE_KEYS,
  LANGUAGE_LEVELS,
  PROFILE_VALUES,
  SOCIAL_KEYS,
  WORK_TYPE_VALUES,
} from '@/modules/talent/domain/talentConstants'
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

  it('no pide el nombre (lo pone n8n) y lo descarta si llega', () => {
    const parsed = candidateFormSchema.parse(
      validFormInput({ name: 'Intruso' }),
    )

    expect(parsed).not.toHaveProperty('name')
  })

  it('el email es obligatorio y se normaliza', () => {
    expect(candidateFormSchema.parse(validFormInput()).email).toBe(
      'ada@example.com',
    )
    expect(
      candidateFormSchema.safeParse(validFormInput({ email: 'no-es-email' }))
        .success,
    ).toBe(false)
    expect(
      candidateFormSchema.safeParse(validFormInput({ email: undefined }))
        .success,
    ).toBe(false)
  })

  it.each([
    '+34 600 000 000',
    '600000000',
    '(93) 123-45.67',
    '+1 202 555 0100',
  ])('teléfono válido: %s', (phone) => {
    expect(
      candidateFormSchema.safeParse(validFormInput({ phone })).success,
    ).toBe(true)
  })

  it.each(['abc', '123', '12345678901234567', '600 000 00x', '+++34600000000'])(
    'teléfono no válido: %s',
    (phone) => {
      expect(
        candidateFormSchema.safeParse(validFormInput({ phone })).success,
      ).toBe(false)
    },
  )

  it('el teléfono es opcional: vacío o ausente es null', () => {
    expect(candidateFormSchema.parse(validFormInput({ phone: '' })).phone).toBe(
      null,
    )
    expect(
      candidateFormSchema.parse(validFormInput({ phone: undefined })).phone,
    ).toBe(null)
  })

  it('profile: al menos uno, sin repetir, y "otro" solo no cuenta', () => {
    expect(
      candidateFormSchema.safeParse(validFormInput({ profile: [] })).success,
    ).toBe(false)
    expect(
      candidateFormSchema.safeParse(validFormInput({ profile: ['otro'] }))
        .success,
    ).toBe(false)
    expect(
      candidateFormSchema.parse(
        validFormInput({ profile: ['copy', 'COPY', 'copy'] }),
      ).profile,
    ).toEqual(['copy'])
  })

  it('profile: acepta el texto libre de "Otro" y lo acota', () => {
    expect(
      candidateFormSchema.parse(
        validFormInput({ profile: ['Dirección de fotografía'] }),
      ).profile,
    ).toEqual(['Dirección de fotografía'])
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ profile: ['x'.repeat(61)] }),
      ).success,
    ).toBe(false)
  })

  it.each(PROFILE_VALUES.filter((value) => value !== 'otro'))(
    'acepta el perfil %s',
    (profile) => {
      expect(
        candidateFormSchema.parse(validFormInput({ profile: [profile] }))
          .profile,
      ).toEqual([profile])
    },
  )

  it('languages: los 23 idiomas del formulario, con nivel de la lista', () => {
    expect(LANGUAGE_KEYS).toHaveLength(23)

    for (const language of LANGUAGE_KEYS) {
      expect(
        candidateFormSchema.safeParse(
          validFormInput({ languages: { [language]: 'nativo' } }),
        ).success,
      ).toBe(true)
    }

    for (const level of LANGUAGE_LEVELS) {
      expect(
        candidateFormSchema.safeParse(
          validFormInput({ languages: { English: level } }),
        ).success,
      ).toBe(true)
    }
  })

  it('languages: rechaza idiomas desconocidos y niveles libres', () => {
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ languages: { en: 'avanzado' } }),
      ).success,
    ).toBe(false)
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ languages: { English: 'C1' } }),
      ).success,
    ).toBe(false)
  })

  it('experience y workTypes: solo las opciones del formulario', () => {
    for (const value of EXPERIENCE_VALUES) {
      expect(
        candidateFormSchema.parse(validFormInput({ experience: value }))
          .experience,
      ).toBe(value)
    }

    expect(
      candidateFormSchema.safeParse(validFormInput({ experience: '5 años' }))
        .success,
    ).toBe(false)
    expect(
      candidateFormSchema.parse(validFormInput({ experience: null }))
        .experience,
    ).toBeNull()
    expect(
      candidateFormSchema.parse(
        validFormInput({ workTypes: [...WORK_TYPE_VALUES, 'freelance'] }),
      ).workTypes,
    ).toEqual([...WORK_TYPE_VALUES])
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ workTypes: ['Freelance'] }),
      ).success,
    ).toBe(false)
  })

  it('socials: las seis redes del formulario y enlaces http(s)', () => {
    expect(SOCIAL_KEYS).toHaveLength(6)

    for (const network of SOCIAL_KEYS) {
      expect(
        candidateFormSchema.safeParse(
          validFormInput({ socials: { [network]: 'https://a.example/x' } }),
        ).success,
      ).toBe(true)
    }

    expect(
      candidateFormSchema.safeParse(
        validFormInput({ socials: { Facebook: 'https://x.com' } }),
      ).success,
    ).toBe(false)
  })

  it.each([
    'javascript:alert(1)',
    'ftp://x.com',
    'mailto:ada@example.com',
    'data:text/html,hola',
    'no es un enlace',
  ])('enlaces: rechaza %s', (link) => {
    expect(
      candidateFormSchema.safeParse(
        validFormInput({ socials: { TikTok: link } }),
      ).success,
    ).toBe(false)
    expect(
      candidateFormSchema.safeParse(validFormInput({ projects: [{ link }] }))
        .success,
    ).toBe(false)
  })

  it('enlaces: sin esquema se añade https://, como hacía el formulario', () => {
    const parsed = candidateFormSchema.parse(
      validFormInput({
        socials: { LinkedIn: 'linkedin.com/in/ada' },
        projects: [{ link: ' ada.example/portfolio ' }],
      }),
    )

    expect(parsed.socials.LinkedIn).toBe('https://linkedin.com/in/ada')
    expect(parsed.projects[0].link).toBe('https://ada.example/portfolio')
  })

  it('enlaces: http se respeta y un puerto no es un esquema', () => {
    const parsed = candidateFormSchema.parse(
      validFormInput({
        projects: [{ link: 'http://a.example' }, { link: 'localhost:3000/x' }],
      }),
    )

    expect(parsed.projects.map((project) => project.link)).toEqual([
      'http://a.example',
      'https://localhost:3000/x',
    ])
  })

  it('proyectos: al menos uno y como mucho 10', () => {
    expect(
      candidateFormSchema.safeParse(
        validFormInput({
          projects: Array.from({ length: 11 }, () => ({
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
