import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { makeResolvePreviewContext } from '@/modules/content/application/resolvePreviewContext'
import type { PublicContentReader } from '@/modules/content/domain/publicContentReader'
import { encodePreviewToken } from '@/modules/content/infrastructure/previewToken'
import { decodePreviewToken } from '@/modules/content/infrastructure/previewToken'

const PUBLIC_CONTENT = { id: 'content-a', slug: 'mi-caso' }

function fakeReader(content: unknown): PublicContentReader {
  return {
    contentBySlug: vi.fn(async () => content),
  } as unknown as PublicContentReader
}

describe('resolvePreviewContext (§15.3)', () => {
  let publicReader: PublicContentReader
  let previewReader: PublicContentReader
  let makePreviewReader: ReturnType<typeof vi.fn>
  let revokedAt: ReturnType<typeof vi.fn>
  let resolvePreviewContext: ReturnType<typeof makeResolvePreviewContext>

  function setup(publicContent: unknown, previewContent: unknown) {
    publicReader = fakeReader(publicContent)
    previewReader = fakeReader(previewContent)
    makePreviewReader = vi.fn(() => previewReader)
    revokedAt = vi.fn(async () => null)
    resolvePreviewContext = makeResolvePreviewContext({
      publicReader,
      previewReader: makePreviewReader as () => PublicContentReader,
      decodePreviewToken,
      revocations: {
        revokedAt: revokedAt as (contentId: string) => Promise<number | null>,
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin token: lee con el lector público, isPreview false', async () => {
    setup(PUBLIC_CONTENT, PUBLIC_CONTENT)

    const result = await resolvePreviewContext('mi-caso', undefined)

    expect(result).toEqual({
      content: PUBLIC_CONTENT,
      reader: publicReader,
      isPreview: false,
    })
    expect(publicReader.contentBySlug).toHaveBeenCalledExactlyOnceWith(
      'mi-caso',
      undefined,
    )
    expect(makePreviewReader).not.toHaveBeenCalled()
  })

  it('token válido cuyo contentId coincide con el contenido de este slug: lee con el lector con privilegios y lo devuelve', async () => {
    setup(null, PUBLIC_CONTENT)

    const token = encodePreviewToken('content-a')
    const result = await resolvePreviewContext('mi-caso', token)

    expect(result).toEqual({
      content: PUBLIC_CONTENT,
      reader: previewReader,
      isPreview: true,
    })
    expect(previewReader.contentBySlug).toHaveBeenCalledExactlyOnceWith(
      'mi-caso',
      undefined,
    )
    expect(publicReader.contentBySlug).not.toHaveBeenCalled()
  })

  it('token válido pero para OTRO contentId (slug cambiado tras generar el link): cae al camino público', async () => {
    // La lectura con privilegios por este slug devuelve un contenido cuyo
    // id no es el que firma el token — no se sirve con privilegios.
    setup(PUBLIC_CONTENT, PUBLIC_CONTENT)

    const token = encodePreviewToken('content-ajeno')
    const result = await resolvePreviewContext('mi-caso', token)

    expect(result.isPreview).toBe(false)
    expect(result.reader).toBe(publicReader)
  })

  it('token corrupto: cae al camino público sin crear el lector con privilegios', async () => {
    setup(PUBLIC_CONTENT, PUBLIC_CONTENT)

    const result = await resolvePreviewContext('mi-caso', 'basura-no-token')

    expect(result.isPreview).toBe(false)
    expect(makePreviewReader).not.toHaveBeenCalled()
  })

  it('token válido pero el slug ya no existe en absoluto: cae al camino público (content null)', async () => {
    setup(null, null)

    const token = encodePreviewToken('content-a')
    const result = await resolvePreviewContext('slug-borrado', token)

    expect(result).toEqual({
      content: null,
      reader: publicReader,
      isPreview: false,
    })
  })

  describe('revocación de enlaces (SEC-ADM-D2)', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('un enlace emitido antes de la revocación no abre el borrador y no crea el lector con privilegios', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))
      setup(PUBLIC_CONTENT, PUBLIC_CONTENT)
      const token = encodePreviewToken('content-a')

      revokedAt.mockResolvedValue(
        new Date('2026-01-01T10:30:00.000Z').getTime(),
      )
      vi.setSystemTime(new Date('2026-01-01T11:00:00.000Z'))

      const result = await resolvePreviewContext('mi-caso', token)

      expect(result.isPreview).toBe(false)
      expect(result.reader).toBe(publicReader)
      expect(revokedAt).toHaveBeenCalledWith('content-a')
      expect(makePreviewReader).not.toHaveBeenCalled()
    })

    it('un enlace generado después de revocar funciona', async () => {
      vi.useFakeTimers()
      setup(null, PUBLIC_CONTENT)
      revokedAt.mockResolvedValue(
        new Date('2026-01-01T10:30:00.000Z').getTime(),
      )
      vi.setSystemTime(new Date('2026-01-01T10:45:00.000Z'))

      const token = encodePreviewToken('content-a')
      const result = await resolvePreviewContext('mi-caso', token)

      expect(result.isPreview).toBe(true)
    })

    it('un enlace emitido en la misma milésima que la revocación se rechaza', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T10:30:00.000Z'))
      setup(PUBLIC_CONTENT, PUBLIC_CONTENT)
      const token = encodePreviewToken('content-a')

      revokedAt.mockResolvedValue(
        new Date('2026-01-01T10:30:00.000Z').getTime(),
      )

      expect((await resolvePreviewContext('mi-caso', token)).isPreview).toBe(
        false,
      )
    })

    it('sin token no se consulta la revocación', async () => {
      setup(PUBLIC_CONTENT, PUBLIC_CONTENT)

      await resolvePreviewContext('mi-caso', undefined)

      expect(revokedAt).not.toHaveBeenCalled()
    })

    it('con un token corrupto no se consulta la revocación', async () => {
      setup(PUBLIC_CONTENT, PUBLIC_CONTENT)

      await resolvePreviewContext('mi-caso', 'basura-no-token')

      expect(revokedAt).not.toHaveBeenCalled()
    })
  })

  it('pasa el locale pedido a la lectura', async () => {
    setup(PUBLIC_CONTENT, PUBLIC_CONTENT)

    await resolvePreviewContext('mi-caso', undefined, 'en')

    expect(publicReader.contentBySlug).toHaveBeenCalledWith('mi-caso', 'en')
  })
})
