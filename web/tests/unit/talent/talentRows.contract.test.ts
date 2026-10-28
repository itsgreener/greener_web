import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import {
  PROFILE_VALUES,
  WORK_TYPE_VALUES,
} from '@/modules/talent/domain/talentConstants'
import {
  accessExpiresAt,
  buildCandidateUpdate,
  buildFileRow,
  buildProjectRows,
  buildSignupRow,
  buildStoragePath,
} from '@/modules/talent/domain/talentRows'
import {
  candidateFormSchema,
  signupSchema,
} from '@/modules/talent/domain/talentSchemas'
import { TOKEN, CANDIDATE_ID, validFormInput } from '@tests/helpers/talentFakes'

/**
 * Tests de CONTRATO (fase 1 de plan-talent-careers.md): fijan, columna a
 * columna, lo que la web escribe en Supabase-talent. n8n lee estas filas sin
 * comprobar nada (docs/especificaciones/contrato-datos-talent.md §4): si un
 * test de aquí tiene que cambiar, primero cambia el contrato.
 */

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('alta por email → fila de candidates', () => {
  it('escribe exactamente email, status, access_token y su caducidad (el resto, por defecto)', () => {
    const { email } = signupSchema.parse({ email: '  Ada@Example.COM ' })

    expect(
      buildSignupRow(email, TOKEN, new Date('2026-10-28T10:00:00.000Z')),
    ).toEqual({
      email: 'ada@example.com',
      status: 'processed',
      access_token: TOKEN,
      access_token_expires_at: '2026-11-04T10:00:00.000Z',
    })
  })

  it('el enlace caduca a los 7 días exactos de emitirse', () => {
    expect(accessExpiresAt(new Date('2026-12-28T23:30:00.000Z'))).toBe(
      '2027-01-04T23:30:00.000Z',
    )
  })

  it('el status es processed: es el que espera "Enviar mail a candidato"', () => {
    expect(buildSignupRow('a@b.co', TOKEN).status).toBe('processed')
  })
})

describe('formulario → UPDATE de candidates', () => {
  it('traduce columna a columna, con arrays y objetos; status = completed', () => {
    const form = candidateFormSchema.parse(validFormInput())

    expect(buildCandidateUpdate(form)).toEqual({
      email: 'ada@example.com',
      status: 'completed',
      phone: '+34 600 000 000',
      comment: 'Me gustaría colaborar.',
      profile: ['diseno', 'video'],
      experience: '5-10',
      work_types: ['freelance', 'fulltime'],
      rate_day: 300,
      rate_hour: null,
      languages: {
        English: 'avanzado',
        Castellano: 'nativo',
        Català: 'bilingue',
      },
      socials: { LinkedIn: 'https://linkedin.com/in/ada' },
      newsletter_accepted: true,
    })
  })

  it('el status es completed (como la web antigua); closed lo pone n8n', () => {
    const row = buildCandidateUpdate(
      candidateFormSchema.parse(validFormInput()),
    )

    expect(row.status).toBe('completed')
  })

  it('las tarifas solo se guardan si marcó freelance', () => {
    const row = buildCandidateUpdate(
      candidateFormSchema.parse(
        validFormInput({ workTypes: ['fulltime'], rateDay: 300, rateHour: 40 }),
      ),
    )

    expect(row.rate_day).toBeNull()
    expect(row.rate_hour).toBeNull()
  })

  it('si el email solo cambia en mayúsculas se conserva el guardado', () => {
    const form = candidateFormSchema.parse(validFormInput())

    expect(buildCandidateUpdate(form, 'Ada@Example.com').email).toBe(
      'Ada@Example.com',
    )
    expect(buildCandidateUpdate(form, 'otra@example.com').email).toBe(
      'ada@example.com',
    )
  })

  it('"Otro" con texto libre guarda el texto y no la palabra otro', () => {
    const form = candidateFormSchema.parse(
      validFormInput({
        profile: ['diseno', 'otro', 'Dirección de fotografía'],
      }),
    )

    expect(buildCandidateUpdate(form).profile).toEqual([
      'diseno',
      'Dirección de fotografía',
    ])
  })

  it('no escribe las columnas de n8n ni las de control', () => {
    const row = buildCandidateUpdate(
      candidateFormSchema.parse(validFormInput()),
    )

    for (const forbidden of [
      'name',
      'access_token',
      'file_path',
      'file_name',
      'ai_comment',
      'uploaded_by',
      'uploaded_by_id',
      'blocked',
      'id',
      'created_at',
    ]) {
      expect(row).not.toHaveProperty(forbidden)
    }
  })

  it('un formulario mínimo deja arrays vacíos y objetos vacíos, nunca null', () => {
    const form = candidateFormSchema.parse({
      email: 'ada@example.com',
      profile: ['diseno'],
      projects: [{ link: 'https://ada.example' }],
    })
    const row = buildCandidateUpdate(form)

    expect(row.work_types).toEqual([])
    expect(row.languages).toEqual({})
    expect(row.socials).toEqual({})
    expect(row.profile).toEqual(['diseno'])
    expect(row.newsletter_accepted).toBe(false)
    expect(row.phone).toBeNull()
    expect(row.comment).toBeNull()
    expect(row.experience).toBeNull()
  })

  it('la clave de idioma se guarda literal ("English", no "en")', () => {
    const row = buildCandidateUpdate(
      candidateFormSchema.parse(
        validFormInput({ languages: { English: 'intermedio' } }),
      ),
    )

    expect(Object.keys(row.languages)).toEqual(['English'])
  })

  it('PROPIEDAD: para cualquier formulario válido, lo que n8n lee nunca es null', () => {
    const profile = fc.array(
      fc.oneof(
        fc.constantFrom(...PROFILE_VALUES),
        fc.string({ minLength: 1, maxLength: 30 }),
      ),
      { minLength: 1, maxLength: 6 },
    )

    fc.assert(
      fc.property(
        profile,
        fc.array(fc.constantFrom(...WORK_TYPE_VALUES), { maxLength: 6 }),
        fc.boolean(),
        (profileValues, workTypes, newsletter) => {
          const parsed = candidateFormSchema.safeParse({
            email: 'ada@example.com',
            profile: profileValues,
            workTypes,
            newsletterAccepted: newsletter,
            projects: [{ link: 'https://ada.example' }],
          })

          if (!parsed.success) return

          const row = buildCandidateUpdate(parsed.data)

          expect(Array.isArray(row.profile)).toBe(true)
          expect(row.profile.length).toBeGreaterThan(0)
          expect(Array.isArray(row.work_types)).toBe(true)
          expect(row.status).toBe('completed')
          expect(row.languages).toEqual(expect.any(Object))
          expect(row.languages).not.toBeNull()
          expect(row.socials).not.toBeNull()
        },
      ),
    )
  })
})

describe('formulario → INSERT de projects', () => {
  it('una fila por proyecto, con el candidato y el token; comment puede ser null', () => {
    const form = candidateFormSchema.parse(validFormInput())

    expect(buildProjectRows(CANDIDATE_ID, TOKEN, form)).toEqual([
      {
        candidate_id: CANDIDATE_ID,
        link: 'https://ada.example/portfolio',
        comment: 'Mi portfolio',
        access_token: TOKEN,
      },
      {
        candidate_id: CANDIDATE_ID,
        link: 'https://ada.example/reel',
        comment: null,
        access_token: TOKEN,
      },
    ])
  })

  it('exige al menos un proyecto: sin él, n8n no llegaría a "closed"', () => {
    const result = candidateFormSchema.safeParse(
      validFormInput({ projects: [] }),
    )

    expect(result.success).toBe(false)
  })
})

describe('subida de ficheros → bucket y fila de files', () => {
  it('la ruta es uploads/<uuid>.<ext>, ASCII y sin espacios', () => {
    const path = buildStoragePath('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'pdf')

    expect(path).toBe('uploads/7c9e6679-7425-40de-944b-e07fc1f90ae7.pdf')
    expect(path).toMatch(
      /^uploads\/[0-9a-f-]{36}\.(pdf|doc|docx|png|jpg|jpeg|webp)$/,
    )
    expect(path).not.toMatch(/[^\x21-\x7e]/)
  })

  it('la fila de files lleva candidato, ruta y token; type y status los pone n8n', () => {
    const row = buildFileRow(CANDIDATE_ID, TOKEN, 'uploads/x.pdf')

    expect(row).toEqual({
      candidate_id: CANDIDATE_ID,
      path: 'uploads/x.pdf',
      access_token: TOKEN,
    })
    expect(row).not.toHaveProperty('type')
    expect(row).not.toHaveProperty('status')
  })
})

describe('token', () => {
  it('el UUID v4 de crypto.randomUUID() cumple el patrón del contrato', () => {
    expect(crypto.randomUUID()).toMatch(UUID_V4)
  })
})
