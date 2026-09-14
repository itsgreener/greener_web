import { describe, it, expect, vi, beforeEach } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

const validInput = {
  contentId: CONTENT_ID,
  mediaId: MEDIA_ID,
  cloudinaryPublicId: 'greener/content/abc123',
  kind: 'image' as const,
}

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/media/application/deleteCoverMedia', () => ({
  deleteCoverMedia: vi.fn(),
}))

vi.mock('@/modules/media/infrastructure/cloudinaryServer', () => ({
  createSignedImageUpload: vi.fn(),
  createSignedVideoUpload: vi.fn(),
  deleteCloudinaryAsset: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('deleteCoverMediaAction', () => {
  it('con datos inválidos, no llega a llamar ni a Postgres ni a Cloudinary', async () => {
    const { deleteCoverMediaAction } =
      await import('@/app/admin/contents/[id]/edit/mediaActions')
    const { deleteCoverMedia } =
      await import('@/modules/media/application/deleteCoverMedia')
    const { deleteCloudinaryAsset } =
      await import('@/modules/media/infrastructure/cloudinaryServer')

    const result = await deleteCoverMediaAction({ contentId: 'no-es-uuid' })

    expect(result.ok).toBe(false)
    expect(deleteCoverMedia).not.toHaveBeenCalled()
    expect(deleteCloudinaryAsset).not.toHaveBeenCalled()
  })

  it('si Postgres tiene éxito y Cloudinary también, devuelve ok sin warning', async () => {
    const { deleteCoverMediaAction } =
      await import('@/app/admin/contents/[id]/edit/mediaActions')
    const { deleteCoverMedia } =
      await import('@/modules/media/application/deleteCoverMedia')
    const { deleteCloudinaryAsset } =
      await import('@/modules/media/infrastructure/cloudinaryServer')

    vi.mocked(deleteCoverMedia).mockResolvedValue(MEDIA_ID)
    vi.mocked(deleteCloudinaryAsset).mockResolvedValue(undefined)

    const result = await deleteCoverMediaAction(validInput)

    expect(result).toEqual({ ok: true })
    expect(deleteCoverMedia).toHaveBeenCalledWith(validInput)
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith(
      validInput.cloudinaryPublicId,
      validInput.kind,
    )
  })

  it('si Postgres falla porque el medio ya no coincide con el contenido, aborta SIN llamar a Cloudinary', async () => {
    const { deleteCoverMediaAction } =
      await import('@/app/admin/contents/[id]/edit/mediaActions')
    const { deleteCoverMedia } =
      await import('@/modules/media/application/deleteCoverMedia')
    const { deleteCloudinaryAsset } =
      await import('@/modules/media/infrastructure/cloudinaryServer')

    vi.mocked(deleteCoverMedia).mockRejectedValue(
      new Error(
        'El contenido ya no apunta a este medio (posible carrera con otra pestaña)',
      ),
    )

    const result = await deleteCoverMediaAction(validInput)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('otra pestaña')
    }
    expect(deleteCloudinaryAsset).not.toHaveBeenCalled()
  })

  it('si Postgres falla por violación de FK (medio en uso en otro sitio), aborta con un mensaje claro', async () => {
    const { deleteCoverMediaAction } =
      await import('@/app/admin/contents/[id]/edit/mediaActions')
    const { deleteCoverMedia } =
      await import('@/modules/media/application/deleteCoverMedia')
    const { deleteCloudinaryAsset } =
      await import('@/modules/media/infrastructure/cloudinaryServer')

    const fkError = Object.assign(
      new Error('update or delete violates foreign key constraint'),
      {
        code: '23503',
      },
    )

    vi.mocked(deleteCoverMedia).mockRejectedValue(fkError)

    const result = await deleteCoverMediaAction(validInput)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('se sigue usando en otro sitio')
    }
    expect(deleteCloudinaryAsset).not.toHaveBeenCalled()
  })

  it('si Postgres tiene éxito pero Cloudinary falla, devuelve ok:true con un warning — no bloquea la subida', async () => {
    const { deleteCoverMediaAction } =
      await import('@/app/admin/contents/[id]/edit/mediaActions')
    const { deleteCoverMedia } =
      await import('@/modules/media/application/deleteCoverMedia')
    const { deleteCloudinaryAsset } =
      await import('@/modules/media/infrastructure/cloudinaryServer')

    vi.mocked(deleteCoverMedia).mockResolvedValue(MEDIA_ID)
    vi.mocked(deleteCloudinaryAsset).mockRejectedValue(
      new Error('Cloudinary no ha podido borrar el recurso.'),
    )

    const result = await deleteCoverMediaAction(validInput)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.warning).toBeDefined()
    }
  })
})
