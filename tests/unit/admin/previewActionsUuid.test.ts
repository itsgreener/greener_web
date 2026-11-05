import { beforeEach, describe, expect, it, vi } from 'vitest'

const generatePreviewLink = vi.fn()
const recordAuditEvent = vi.fn()

vi.mock('@/modules/content/container', () => ({
  generatePreviewLink: (...args: unknown[]) => generatePreviewLink(...args),
}))

vi.mock('@/lib/auth/adminSession', () => ({
  ADMIN_REQUIRED_MESSAGE: 'sesión caducada',
  isAdminRequest: async () => true,
  getAdminActor: async () => ({ email: 'admin@test.local' }),
}))

vi.mock('@/modules/audit/container', () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEvent(...args),
}))

import { generatePreviewLinkAction } from '@/app/admin/(panel)/contents/[id]/edit/previewActions'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

function form(id: string) {
  const data = new FormData()

  data.set('id', id)

  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  generatePreviewLink.mockResolvedValue('https://greener.test/case/x?preview=t')
  recordAuditEvent.mockResolvedValue(true)
})

// SEC-ADM-B2
describe('generatePreviewLinkAction — validación del id', () => {
  it.each(['', 'no-es-uuid', '../x', '123'])(
    'con id «%s» no genera ningún enlace',
    async (id) => {
      const result = await generatePreviewLinkAction({}, form(id))

      expect(result.error).toBe('El identificador del contenido no es válido.')
      expect(generatePreviewLink).not.toHaveBeenCalled()
      expect(recordAuditEvent).not.toHaveBeenCalled()
    },
  )

  it('con un uuid válido sí lo genera', async () => {
    const result = await generatePreviewLinkAction({}, form(CONTENT_ID))

    expect(result.url).toContain('preview=')
    expect(generatePreviewLink).toHaveBeenCalledWith(CONTENT_ID)
  })
})

// SEC-ADM-F1
describe('generatePreviewLinkAction — registro de actividad', () => {
  it('anota quién ha generado el enlace', async () => {
    await generatePreviewLinkAction({}, form(CONTENT_ID))

    expect(recordAuditEvent).toHaveBeenCalledExactlyOnceWith({
      actorEmail: 'admin@test.local',
      action: 'preview_link',
      entity: 'content',
      entityId: CONTENT_ID,
    })
  })

  it('si el contenido no existe, no anota nada', async () => {
    generatePreviewLink.mockResolvedValue(null)

    const result = await generatePreviewLinkAction({}, form(CONTENT_ID))

    expect(result.error).toBe('No se ha encontrado el contenido.')
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })

  it('si el registro falla, el enlace se entrega igualmente', async () => {
    recordAuditEvent.mockResolvedValue(false)

    const result = await generatePreviewLinkAction({}, form(CONTENT_ID))

    expect(result.url).toContain('preview=')
  })
})
