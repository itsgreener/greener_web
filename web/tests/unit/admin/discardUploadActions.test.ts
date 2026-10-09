import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

// Este fichero prueba la comprobación de admin de verdad (no el doble
// global de tests/setup.ts).
vi.unmock('@/lib/auth/adminSession')

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc,
    auth: {
      getClaims: vi.fn(async () => ({
        data: { claims: { sub: 'admin' } },
        error: null,
      })),
    },
  })),
}))

vi.mock('@/modules/media/application/cleanupMedia', () => ({
  discardUnregisteredUpload: vi.fn(),
}))

import { discardUploadedMediaAction } from '@/app/admin/contents/[id]/edit/discardUploadActions'
import { discardUnregisteredUpload } from '@/modules/media/application/cleanupMedia'

const mockDiscard = vi.mocked(discardUnregisteredUpload)

const VALID = { cloudinaryPublicId: 'greener/content/videos/x', kind: 'video' }

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockResolvedValue({ data: true, error: null })
  mockDiscard.mockResolvedValue(true)
})

describe('discardUploadedMediaAction (5 oct 2026)', () => {
  it('con sesión de admin, descarta el archivo subido y no registrado', async () => {
    expect(await discardUploadedMediaAction(VALID)).toEqual({
      ok: true,
      discarded: true,
    })
    expect(mockDiscard).toHaveBeenCalledWith(
      'greener/content/videos/x',
      'video',
    )
  })

  it('sin ser admin NO borra nada (una Server Action es un endpoint público)', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null })

    expect(await discardUploadedMediaAction(VALID)).toEqual({ ok: false })
    expect(mockDiscard).not.toHaveBeenCalled()
  })

  it('si no se puede comprobar el rol, NO borra', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('x') })

    expect(await discardUploadedMediaAction(VALID)).toEqual({ ok: false })
    expect(mockDiscard).not.toHaveBeenCalled()
  })

  it('rechaza una entrada inválida antes de consultar nada', async () => {
    expect(
      await discardUploadedMediaAction({
        cloudinaryPublicId: '',
        kind: 'video',
      }),
    ).toEqual({ ok: false })
    expect(
      await discardUploadedMediaAction({
        cloudinaryPublicId: 'a',
        kind: 'raw',
      }),
    ).toEqual({ ok: false })
    expect(await discardUploadedMediaAction(null)).toEqual({ ok: false })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('informa de si realmente borró (false si estaba registrado)', async () => {
    mockDiscard.mockResolvedValueOnce(false)

    expect(await discardUploadedMediaAction(VALID)).toEqual({
      ok: true,
      discarded: false,
    })
  })
})
