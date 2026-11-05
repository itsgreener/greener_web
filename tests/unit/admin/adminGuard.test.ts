import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Auditoría 8 oct, P0-1: toda Server Action del ABM comprueba la sesión de
 * admin ANTES de tocar nada (Postgres, Cloudinary, Cloudmersive). Una Server
 * Action se puede invocar con un POST a cualquier ruta, no solo desde el ABM.
 */

vi.mock('@/modules/pin/container', () => ({
  attachPinImage: vi.fn(),
  attachPinVideo: vi.fn(),
  createPin: vi.fn(),
  createPinWithImage: vi.fn(),
  createPinWithVideo: vi.fn(),
  deleteAllPins: vi.fn(),
  deletePin: vi.fn(),
  detachPinMedia: vi.fn(),
  updatePin: vi.fn(),
}))

vi.mock('@/modules/content/container', () => ({
  generatePreviewLink: vi.fn(),
}))

import { isAdminRequest } from '@/lib/auth/adminSession'
import {
  createPinWithImageAction,
  createPinWithVideoAction,
} from '@/app/admin/(panel)/contents/[id]/edit/pinActions'
import { generatePreviewLinkAction } from '@/app/admin/(panel)/contents/[id]/edit/previewActions'
import { generatePreviewLink } from '@/modules/content/container'
import {
  createPin,
  createPinWithImage,
  createPinWithVideo,
} from '@/modules/pin/container'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isAdminRequest).mockResolvedValue(false)
})

describe('Server Actions del ABM sin sesión de admin', () => {
  it('createPinWithVideoAction no crea el pin ni toca nada', async () => {
    const result = await createPinWithVideoAction({
      contentId: CONTENT_ID,
      ratio: '1:1',
      language: 'es',
      alt: 'alt',
      cloudinaryPublicId: 'greener/content/videos/x',
      width: 100,
      height: 100,
      durationSeconds: 5,
      bytes: 1000,
    })

    expect(result.ok).toBe(false)
    expect(createPinWithVideo).not.toHaveBeenCalled()
    expect(createPin).not.toHaveBeenCalled()
  })

  it('createPinWithImageAction no crea el pin ni toca nada', async () => {
    const result = await createPinWithImageAction({
      contentId: CONTENT_ID,
      ratio: '1:1',
      language: 'es',
      alt: 'alt',
      cloudinaryPublicId: 'greener/content/x',
      width: 100,
      height: 100,
      bytes: 1000,
    })

    expect(result.ok).toBe(false)
    expect(createPinWithImage).not.toHaveBeenCalled()
    expect(createPin).not.toHaveBeenCalled()
  })

  it('generatePreviewLinkAction no genera ningún token', async () => {
    const formData = new FormData()
    formData.set('id', CONTENT_ID)

    const result = await generatePreviewLinkAction({}, formData)

    expect(result.url).toBeUndefined()
    expect(result.error).toBeDefined()
    expect(generatePreviewLink).not.toHaveBeenCalled()
  })
})
