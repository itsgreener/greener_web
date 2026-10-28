import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  decodeSignedToken,
  encodeSignedToken,
} from '@/lib/security/signedToken'

/**
 * SEC-ADM-D1: la firma cubre el propósito. Un token emitido para el feed no
 * puede aceptarse como enlace de preview aunque el payload fuese idéntico.
 */

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('tokens firmados con propósito', () => {
  it('se decodifica con el mismo propósito', () => {
    const token = encodeSignedToken('preview', { contentId: 'a' })

    expect(decodeSignedToken('preview', token)).toEqual({ contentId: 'a' })
  })

  it('se rechaza con otro propósito', () => {
    const token = encodeSignedToken('cursor', { contentId: 'a' })

    expect(decodeSignedToken('preview', token)).toBeNull()
  })

  it('el mismo payload da firmas distintas según el propósito', () => {
    const payload = { sessionId: 's', roundIndex: 0 }

    expect(encodeSignedToken('cursor', payload)).not.toBe(
      encodeSignedToken('preview', payload),
    )
  })

  it('rechaza basura y firmas ajenas', () => {
    expect(decodeSignedToken('cursor', 'no-es-un-token')).toBeNull()
    expect(decodeSignedToken('cursor', 'a.b.c')).toBeNull()
  })

  it('firmado con una clave y comprobado con otra, no vale', async () => {
    vi.stubEnv('APP_SIGNING_SECRET', 'a'.repeat(40))
    vi.resetModules()
    const first = await import('@/lib/security/signedToken')
    const token = first.encodeSignedToken('cursor', { n: 1 })

    vi.stubEnv('APP_SIGNING_SECRET', 'b'.repeat(40))
    vi.resetModules()
    const second = await import('@/lib/security/signedToken')

    expect(second.decodeSignedToken('cursor', token)).toBeNull()
  })

  it('en producción sin APP_SIGNING_SECRET no firma (falla en lugar de usar la clave de servicio)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_SIGNING_SECRET', '')
    vi.resetModules()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { encodeSignedToken: encode } =
      await import('@/lib/security/signedToken')

    expect(() => encode('cursor', {})).toThrow(/firma de tokens/)
  })
})
