import { describe, expect, it } from 'vitest'

import { candidateFormSchema } from '@/modules/talent/domain/talentSchemas'

/**
 * Contrato con la web antigua de talent (transitoria): el cuerpo que envía su
 * formulario en `PUT /api/talent/form/[token]` (capturado de una ejecución real
 * en navegador) tiene que validar con el esquema vigente. Si cambia el esquema
 * y esto falla, hay que avisar de que el formulario antiguo se rompe.
 */
const LEGACY_FORM_BODY = {
  email: 'ada@example.com',
  phone: '+34 612 345 678',
  comment: 'Hola',
  profile: ['diseno'],
  experience: '0-1',
  workTypes: ['internship'],
  rateDay: null,
  rateHour: null,
  languages: { Castellano: 'nativo' },
  socials: {},
  newsletterAccepted: true,
  projects: [{ link: 'https://ada.example/portfolio', comment: '' }],
  website: '',
}

describe('cuerpo del formulario de la web antigua', () => {
  it('valida con candidateFormSchema', () => {
    const result = candidateFormSchema.safeParse(LEGACY_FORM_BODY)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.projects).toHaveLength(1)
      expect(result.data.rateDay).toBeNull()
      expect(result.data.newsletterAccepted).toBe(true)
    }
  })

  it('con tarifas de autónomo también valida', () => {
    const result = candidateFormSchema.safeParse({
      ...LEGACY_FORM_BODY,
      workTypes: ['freelance'],
      rateDay: 250,
      rateHour: 40,
    })
    expect(result.success).toBe(true)
  })
})
