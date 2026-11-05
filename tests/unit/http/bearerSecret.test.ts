import { describe, expect, it } from 'vitest'

import { checkBearerSecret } from '@/lib/http/bearerSecret'

const SECRET = 'x'.repeat(40)

function headers(authorization?: string) {
  return new Headers(authorization ? { authorization } : {})
}

describe('checkBearerSecret', () => {
  it('sin secreto configurado: not_configured, aunque venga una credencial', () => {
    expect(checkBearerSecret(headers(`Bearer ${SECRET}`), undefined)).toBe(
      'not_configured',
    )
    expect(checkBearerSecret(headers(`Bearer ${SECRET}`), '')).toBe(
      'not_configured',
    )
  })

  it('credencial correcta: ok', () => {
    expect(checkBearerSecret(headers(`Bearer ${SECRET}`), SECRET)).toBe('ok')
  })

  it.each([undefined, '', 'Bearer ', 'Bearer otra', `Basic ${SECRET}`, SECRET])(
    'credencial ausente o distinta (%j): unauthorized',
    (value) => {
      expect(checkBearerSecret(headers(value), SECRET)).toBe('unauthorized')
    },
  )

  it('una credencial de otra longitud no revienta la comparación', () => {
    expect(checkBearerSecret(headers(`Bearer ${SECRET}extra`), SECRET)).toBe(
      'unauthorized',
    )
  })
})
