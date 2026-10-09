import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetContentBySlug, mockCreateServiceClient } = vi.hoisted(() => ({
  mockGetContentBySlug: vi.fn(),

  mockCreateServiceClient: vi.fn(),
}))

vi.mock('@/modules/content/application/getContentBySlug', () => ({
  getContentBySlug: mockGetContentBySlug,
}))

vi.mock('@/lib/supabase/serviceClient', () => ({
  createServiceClient: mockCreateServiceClient,
}))

import { resolvePreviewContext } from '@/modules/content/application/resolvePreviewContext'
import { encodePreviewToken } from '@/modules/content/infrastructure/previewToken'

const PUBLIC_CONTENT = { id: 'content-a', slug: 'mi-caso' }
const SERVICE_CLIENT = { marker: 'service-client' }

describe('resolvePreviewContext (§15.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin token: devuelve el contenido público, isPreview false, sin cliente', async () => {
    mockGetContentBySlug.mockResolvedValueOnce(PUBLIC_CONTENT)

    const result = await resolvePreviewContext('mi-caso', undefined)

    expect(result).toEqual({
      content: PUBLIC_CONTENT,
      client: undefined,
      isPreview: false,
    })
    expect(mockGetContentBySlug).toHaveBeenCalledExactlyOnceWith(
      'mi-caso',
      undefined,
    )
    expect(mockCreateServiceClient).not.toHaveBeenCalled()
  })

  it('token válido cuyo contentId coincide con el contenido de este slug: usa el cliente con privilegios', async () => {
    mockCreateServiceClient.mockReturnValueOnce(SERVICE_CLIENT)
    mockGetContentBySlug.mockResolvedValueOnce(PUBLIC_CONTENT)

    const token = encodePreviewToken('content-a')
    const result = await resolvePreviewContext('mi-caso', token)

    expect(result).toEqual({
      content: PUBLIC_CONTENT,
      client: SERVICE_CLIENT,
      isPreview: true,
    })
    expect(mockGetContentBySlug).toHaveBeenCalledExactlyOnceWith(
      'mi-caso',
      undefined,
      SERVICE_CLIENT,
    )
  })

  it('token válido pero para OTRO contentId (slug cambiado tras generar el link): cae al camino público', async () => {
    mockCreateServiceClient.mockReturnValueOnce(SERVICE_CLIENT)
    // La lectura con privilegios por este slug devuelve un contenido cuyo
    // id no es el que firma el token — no se sirve con privilegios.
    mockGetContentBySlug.mockResolvedValueOnce(PUBLIC_CONTENT)
    mockGetContentBySlug.mockResolvedValueOnce(PUBLIC_CONTENT)

    const token = encodePreviewToken('content-ajeno')
    const result = await resolvePreviewContext('mi-caso', token)

    expect(result.isPreview).toBe(false)
    expect(result.client).toBeUndefined()
  })

  it('token corrupto: cae al camino público sin tocar el cliente con privilegios', async () => {
    mockGetContentBySlug.mockResolvedValueOnce(PUBLIC_CONTENT)

    const result = await resolvePreviewContext('mi-caso', 'basura-no-token')

    expect(result.isPreview).toBe(false)
    expect(mockCreateServiceClient).not.toHaveBeenCalled()
  })

  it('token válido pero el slug ya no existe en absoluto: cae al camino público (content null)', async () => {
    mockCreateServiceClient.mockReturnValueOnce(SERVICE_CLIENT)
    mockGetContentBySlug.mockResolvedValueOnce(null)
    mockGetContentBySlug.mockResolvedValueOnce(null)

    const token = encodePreviewToken('content-a')
    const result = await resolvePreviewContext('slug-borrado', token)

    expect(result).toEqual({
      content: null,
      client: undefined,
      isPreview: false,
    })
  })
})
