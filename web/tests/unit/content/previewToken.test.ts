import { describe, it, expect, vi, afterEach } from 'vitest'
import { encodeSignedToken } from '@/lib/security/signedToken'
import {
  encodePreviewToken,
  decodePreviewToken,
  PREVIEW_TOKEN_TTL_MS,
} from '@/modules/content/infrastructure/previewToken'

describe('token de preview firmado (§15.3)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('codifica y decodifica el mismo contentId', () => {
    const token = encodePreviewToken('content-a')
    expect(decodePreviewToken(token)?.contentId).toBe('content-a')
  })

  it('lleva la fecha de emisión, que es la que compara la revocación', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))

    const token = encodePreviewToken('content-a')

    expect(decodePreviewToken(token)?.issuedAt).toBe(
      new Date('2026-01-01T10:00:00.000Z').getTime(),
    )
  })

  it('rechaza un token bien firmado pero sin fecha de emisión (formato anterior a la revocación)', () => {
    const legacy = encodeSignedToken('preview', {
      contentId: 'content-a',
      expiresAt: Date.now() + 1000,
    })

    expect(decodePreviewToken(legacy)).toBeNull()
  })

  it('rechaza un token con la firma alterada', () => {
    const token = encodePreviewToken('content-a')
    const [body] = token.split('.')
    expect(decodePreviewToken(`${body}.firmafalsa`)).toBeNull()
  })

  it('rechaza un token cuyo cuerpo fue alterado tras firmarlo (contentId fabricado)', () => {
    const token = encodePreviewToken('content-a')
    const [, signature] = token.split('.')
    const forgedBody = Buffer.from(
      JSON.stringify({
        contentId: 'content-ajeno',
        expiresAt: Date.now() + 1000,
      }),
      'utf-8',
    ).toString('base64url')
    expect(decodePreviewToken(`${forgedBody}.${signature}`)).toBeNull()
  })

  it('rechaza basura que no tiene el formato cuerpo.firma', () => {
    expect(decodePreviewToken('no-es-un-token')).toBeNull()
    expect(decodePreviewToken('')).toBeNull()
  })

  it('vale justo antes de caducar y deja de valer justo después (24 horas)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const token = encodePreviewToken('content-a')

    vi.setSystemTime(new Date('2026-01-01T23:59:59.999Z'))
    expect(decodePreviewToken(token)?.contentId).toBe('content-a')

    vi.setSystemTime(new Date('2026-01-02T00:00:00.001Z'))
    expect(decodePreviewToken(token)).toBeNull()
  })

  it('el tiempo de vida es de 24 horas, no de días (SEC-ADM-D2)', () => {
    expect(PREVIEW_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('dos contentId distintos producen tokens distintos', () => {
    const a = encodePreviewToken('content-a')
    const b = encodePreviewToken('content-b')
    expect(a).not.toBe(b)
  })
})
