import { beforeEach, describe, expect, it, vi } from 'vitest'

const revokePreviewLinks = vi.fn()
const isAdminRequest = vi.fn()

vi.mock('@/modules/content/container', () => ({
  generatePreviewLink: vi.fn(),
  revokePreviewLinks: (...args: unknown[]) => revokePreviewLinks(...args),
}))

vi.mock('@/lib/auth/adminSession', () => ({
  ADMIN_REQUIRED_MESSAGE: 'sesión caducada',
  isAdminRequest: () => isAdminRequest(),
  getAdminActor: async () => ({ email: 'admin@test.local' }),
}))

vi.mock('@/modules/audit/container', () => ({
  recordAuditEvent: vi.fn(),
}))

import { revokePreviewLinksAction } from '@/app/admin/(panel)/contents/[id]/edit/previewActions'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

function form(id: string) {
  const data = new FormData()

  data.set('id', id)

  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  isAdminRequest.mockResolvedValue(true)
  revokePreviewLinks.mockResolvedValue(true)
})

describe('revokePreviewLinksAction', () => {
  it('sin sesión de admin no revoca nada', async () => {
    isAdminRequest.mockResolvedValue(false)

    const result = await revokePreviewLinksAction({}, form(CONTENT_ID))

    expect(result.error).toBe('sesión caducada')
    expect(revokePreviewLinks).not.toHaveBeenCalled()
  })

  it.each(['', 'no-es-uuid', '../x', '123'])(
    'con id «%s» no revoca nada',
    async (id) => {
      const result = await revokePreviewLinksAction({}, form(id))

      expect(result.error).toBe('El identificador del contenido no es válido.')
      expect(revokePreviewLinks).not.toHaveBeenCalled()
    },
  )

  it('con un uuid válido revoca y lo confirma', async () => {
    const result = await revokePreviewLinksAction({}, form(CONTENT_ID))

    expect(revokePreviewLinks).toHaveBeenCalledWith(CONTENT_ID)
    expect(result.message).toContain('revocados')
    expect(result.error).toBeUndefined()
  })

  it('si el contenido no existe, lo dice', async () => {
    revokePreviewLinks.mockResolvedValue(false)

    const result = await revokePreviewLinksAction({}, form(CONTENT_ID))

    expect(result.error).toBe('No se ha encontrado el contenido.')
  })

  it('si falla la base, devuelve un error genérico y lo registra', async () => {
    revokePreviewLinks.mockRejectedValue(new Error('boom'))

    const result = await revokePreviewLinksAction({}, form(CONTENT_ID))

    expect(result.error).toBe('No se han podido revocar los enlaces.')
    expect(console.error).toHaveBeenCalled()
  })
})
