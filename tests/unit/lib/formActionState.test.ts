import { describe, expect, it } from 'vitest'

import { toFormState } from '@/lib/forms/formActionState'

describe('toFormState', () => {
  it('traduce un fallo con errores por campo', () => {
    expect(
      toFormState({ ok: false, fieldErrors: { email: ['Email no válido'] } }),
    ).toEqual({ fieldErrors: { email: ['Email no válido'] } })
  })

  it('traduce un fallo general', () => {
    expect(
      toFormState({ ok: false, formError: 'Demasiados intentos' }),
    ).toEqual({ formError: 'Demasiados intentos' })
  })

  it('no arrastra `ok` al estado de la acción', () => {
    expect(toFormState({ ok: false, formError: 'x' })).not.toHaveProperty('ok')
  })
})
